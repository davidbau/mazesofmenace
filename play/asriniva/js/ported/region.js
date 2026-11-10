import {C} from './c-runtime.js';
/* NetHack 5.0	region.c	$NHDT-Date: 1727251269 2024/09/25 08:01:09 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.104 $ */
/* Copyright (c) 1996 by Jean-Christophe Collet  */
/* NetHack may be freely redistributed.  See license for details. */


/*
 * This should really go into the level structure, but
 * I'll start here for ease. It *WILL* move into the level
 * structure eventually.
 */




















export const callbacks = [
    inside_gas_cloud,
    expire_gas_cloud
];

/* Should be inlined. */
export function inside_rect(r, x, y)
{
    return (x >= r.lx && x <= r.hx && y >= r.ly && y <= r.hy);
}

/*
 * Check if a point is inside a region.
 */
export function inside_region(reg, x, y)
{
    let i;

    if (reg == 0 || !inside_rect(reg.bounding_box, x, y))
        return 0;
    for (i = 0; i < reg.nrects; i++)
        if (inside_rect(reg.rects[i], x, y))
            return 1;
    return 0;
}

/*
 * Create a region. It does not activate it.
 */
export function create_region(rects, nrect)
{
    let i;
    let reg;

    reg = C.region(C.alloc(C.regionSize));
    C.memset(reg, 0, C.regionSize);
    /* Determines bounding box */
    if (nrect > 0) {
        C.copyRect(reg.bounding_box, rects[0]);
    } else {
        reg.bounding_box.lx = C.COLNO;
        reg.bounding_box.ly = C.ROWNO;
        reg.bounding_box.hx = 0; /* 1 */
        reg.bounding_box.hy = 0;
    }
    reg.nrects = nrect;
    reg.rects = (nrect > 0) ? C.rectArray(C.alloc(nrect * C.rectSize)) : 0;
    for (i = 0; i < nrect; i++) {
        if (rects[i].lx < reg.bounding_box.lx)
            reg.bounding_box.lx = rects[i].lx;
        if (rects[i].ly < reg.bounding_box.ly)
            reg.bounding_box.ly = rects[i].ly;
        if (rects[i].hx > reg.bounding_box.hx)
            reg.bounding_box.hx = rects[i].hx;
        if (rects[i].hy > reg.bounding_box.hy)
            reg.bounding_box.hy = rects[i].hy;
        C.copyRect(reg.rects[i], rects[i]);
    }
    reg.ttl = -1n; /* Defaults */
    reg.attach_2_u = 0;
    reg.attach_2_m = 0;
    /* reg->attach_2_o = NULL; */
    reg.enter_msg = 0;
    reg.leave_msg = 0;
    reg.expire_f = C.NO_CALLBACK;
    reg.enter_f = C.NO_CALLBACK;
    reg.can_enter_f = C.NO_CALLBACK;
    reg.leave_f = C.NO_CALLBACK;
    reg.can_leave_f = C.NO_CALLBACK;
    reg.inside_f = C.NO_CALLBACK;
    C.clear_hero_inside(reg);
    C.clear_heros_fault(reg);
    reg.n_monst = 0;
    reg.max_monst = 0;
    reg.monsters = 0;
    C.copyAny(reg.arg, C.cg.zeroany);
    return reg;
}

/*
 * Add rectangle to region.
 */
export function add_rect_to_reg(reg, rect)
{
    let tmp_rect;

    tmp_rect = C.rectArray(C.alloc((reg.nrects + 1) * C.rectSize));
    if (reg.nrects > 0) {
        C.memcpy(tmp_rect, reg.rects,
                      reg.nrects * C.rectSize);
        C.free(reg.rects);
    }
    C.copyRect(tmp_rect[reg.nrects], rect);
    reg.nrects++;
    reg.rects = tmp_rect;
    /* Update bounding box if needed */
    if (reg.bounding_box.lx > rect.lx)
        reg.bounding_box.lx = rect.lx;
    if (reg.bounding_box.ly > rect.ly)
        reg.bounding_box.ly = rect.ly;
    if (reg.bounding_box.hx < rect.hx)
        reg.bounding_box.hx = rect.hx;
    if (reg.bounding_box.hy < rect.hy)
        reg.bounding_box.hy = rect.hy;
}

/*
 * Add a monster to the region
 */
export function add_mon_to_reg(reg, mon)
{
    let i;
    let tmp_m;

    /* if this is a long worm, it might already be present in the region;
       only include it once no matter how segments the region contains */
    if (mon_in_region(reg, mon)) {
        if (mon.data != C.mons[C.PM_LONG_WORM])
            C.impossible("add_mon_to_reg: %s [#%u] already in region.",
                       C.m_monnam(mon), mon.m_id);
        return;
    }
    if (reg.max_monst <= reg.n_monst) {
        tmp_m = C.uintArray(C.alloc(C.unsignedSize
                                   * (reg.max_monst + C.MONST_INC)));
        if (reg.max_monst > 0) {
            for (i = 0; i < reg.max_monst; i++)
                tmp_m[i] = reg.monsters[i];
            C.free(reg.monsters);
        }
        reg.monsters = tmp_m;
        reg.max_monst += C.MONST_INC;
    }
    reg.monsters[reg.n_monst++] = mon.m_id;
}

/*
 * Remove a monster from the region list (it left or died...)
 */
export function remove_mon_from_reg(reg, mon)
{
    let i;

    for (i = 0; i < reg.n_monst; i++)
        if (reg.monsters[i] == mon.m_id) {
            reg.n_monst--;
            reg.monsters[i] = reg.monsters[reg.n_monst];
            return;
        }
}

/*
 * Check if a monster is inside the region.
 * It's probably quicker to check with the region internal list
 * than to check for coordinates.
 */
export function mon_in_region(reg, mon)
{
    let i;

    for (i = 0; i < reg.n_monst; i++)
        if (reg.monsters[i] == mon.m_id)
            return 1;
    return 0;
}

/*0*/
/* !SFCTOOL */

/*
 * Free mem from region.
 */
export function free_region(reg)
{
    if (reg) {
        if (reg.rects)
            C.free(reg.rects);
        if (reg.monsters)
            C.free(reg.monsters);
        if (reg.enter_msg)
            C.free(reg.enter_msg);
        if (reg.leave_msg)
            C.free(reg.leave_msg);
        C.free(reg);
    }
}

/*
 * Add a region to the list.
 * This actually activates the region.
 */
export function add_region(reg)
{
    let tmp_reg;
    let i, j;

    if (C.gm.max_regions <= C.svn.n_regions) {
        tmp_reg = C.gr.regions;
        C.gr.regions =
            C.regionArray(C.alloc((C.gm.max_regions + 10) * C.pointerSize));
        if (C.gm.max_regions > 0) {
            C.memcpy(C.gr.regions, tmp_reg,
                          C.gm.max_regions * C.pointerSize);
            C.free(tmp_reg);
        }
        C.gm.max_regions += 10;
    }
    C.gr.regions[C.svn.n_regions] = reg;
    C.svn.n_regions++;
    /* Check for monsters inside the region */
    for (i = reg.bounding_box.lx; i <= reg.bounding_box.hx; i++)
        for (j = reg.bounding_box.ly; j <= reg.bounding_box.hy; j++) {
    let mtmp;
    let is_inside = 0;

            /* Some regions can cross the level boundaries */
            if (!C.isok(i, j))
                continue;
            if (inside_region(reg, i, j)) {
                is_inside = 1;
                /* if there's a monster here, add it to the region */
                if ((mtmp = C.m_at(i, j)) != 0
                    ) {
                    add_mon_to_reg(reg, mtmp);
                }
            }
            if (reg.visible) {
                if (is_inside)
                    C.block_point(i, j);
                if (C.cansee(i, j))
                    C.newsym(i, j);
            }
        }
    /* Check for player now... */
    if (inside_region(reg, C.u.ux, C.u.uy))
        C.set_hero_inside(reg);
    else
        C.clear_hero_inside(reg);
}

/*
 * Remove a region from the list & free it.
 */
export function remove_region(reg)
{
    let i, x, y;

    for (i = 0; i < C.svn.n_regions; i++)
        if (C.gr.regions[i] == reg)
            break;
    if (i == C.svn.n_regions)
        return;

    /* remove region before potential newsym() calls, but don't free it yet */
    if (--C.svn.n_regions != i)
        C.gr.regions[i] = C.gr.regions[C.svn.n_regions];
    C.gr.regions[C.svn.n_regions] = 0;

    /* Update screen if necessary */
    reg.ttl = -2n; /* for visible_region_at */
    if (reg.visible) {
    let pass;
    let tmp_uinwater = C.u.uinwater;

        /* need to process the region's spots twice, first unblocking all
           locations which no longer block line-of-sight, then redrawing
           spots within revised line-of-sight; skip second pass if blind */
        for (pass = 1; pass <= (C.Blind ? 1 : 2); ++pass) {
            C.u.uinwater = (pass == 1) ? 0 : tmp_uinwater;

            for (x = reg.bounding_box.lx; x <= reg.bounding_box.hx; x++)
                for (y = reg.bounding_box.ly; y <= reg.bounding_box.hy; y++)
                    if (C.isok(x, y) && inside_region(reg, x, y)) {
                        if (pass == 1) {
                            if (!C.does_block(x, y, C.terrain(x,y)))
                                C.unblock_point(x, y);
                        } else { /* pass==2 */
                            if (C.cansee(x, y))
                                C.newsym(x, y);
                        }
                    }
        }
        C.u.uinwater = tmp_uinwater;
    }
    free_region(reg);
}
/* !SFCTOOL */

/*
 * Remove all regions and clear all related data.  This must be done
 * when changing level, for instance.
 */
export function clear_regions()
{
    let i;

    for (i = 0; i < C.svn.n_regions; i++)
        free_region(C.gr.regions[i]);
    C.svn.n_regions = 0;
    if (C.gm.max_regions > 0)
        C.free(C.gr.regions);
    C.gm.max_regions = 0;
    C.gr.regions = 0;
}

/*
 * This function is called every turn.
 * It makes the regions age, if necessary and calls the appropriate
 * callbacks when needed.
 */
export function run_regions()
{
    let i, j, k;
    let f_indx;

    /* reset some messaging variables */
    C.gg.gas_cloud_diss_within = 0;
    C.gg.gas_cloud_diss_seen = 0;

    /* End of life ? */
    /* Do it backward because the array will be modified */
    for (i = C.svn.n_regions - 1; i >= 0; i--) {
        if (C.gr.regions[i].ttl == 0n) {
            if ((f_indx = C.gr.regions[i].expire_f) == C.NO_CALLBACK
                || callbacks[f_indx](C.gr.regions[i], 0))
                remove_region(C.gr.regions[i]);
        }
    }

    /* Process remaining regions */
    for (i = 0; i < C.svn.n_regions; i++) {
        /* Make the region age */
        if (C.gr.regions[i].ttl > 0n)
            C.gr.regions[i].ttl--;
        /* Check if player is inside region */
        f_indx = C.gr.regions[i].inside_f;
        if (f_indx != C.NO_CALLBACK && C.hero_inside(C.gr.regions[i]))
            callbacks[f_indx](C.gr.regions[i], 0);
        /* Check if any monster is inside region */
        if (f_indx != C.NO_CALLBACK) {
            for (j = 0; j < C.gr.regions[i].n_monst; j++) {
    let mtmp =
                    C.find_mid(C.gr.regions[i].monsters[j], C.FM_FMON);

                if (!mtmp || C.DEADMONSTER(mtmp)
                    || callbacks[f_indx](C.gr.regions[i], mtmp)) {
                    /* The monster died, remove it from list */
                    k = (C.gr.regions[i].n_monst -= 1);
                    C.gr.regions[i].monsters[j] = C.gr.regions[i].monsters[k];
                    C.gr.regions[i].monsters[k] = 0;
                    --j; /* current slot has been reused; recheck it next */
                }
            }
        }
    }

    if (C.gg.gas_cloud_diss_within) {
        C.pline_The("gas cloud around you dissipates.");
        /* normally won't see additional dissipation when within */
        /* FIXME? this assumes that additional dissipation is close by */
        if (C.u.xray_range <= 1)
            C.gg.gas_cloud_diss_seen = 0;
        C.gg.gas_cloud_diss_within = 0;
    }
    if (C.gg.gas_cloud_diss_seen) {
        C.You_see("%s gas cloud%s dissipate.",
                (C.gg.gas_cloud_diss_seen == 1) ? "a" : "some",
                (C.gg.gas_cloud_diss_seen == 1 ? "" : "s"));
        C.gg.gas_cloud_diss_seen = 0;
    }
}

/*
 * check whether player enters/leaves one or more regions.
 */
export function in_out_region(x, y)
{
    let i, f_indx = 0;

    /* First check if hero can do the move */
    for (i = 0; i < C.svn.n_regions; i++) {
        if (C.gr.regions[i].attach_2_u)
            continue;
        if (inside_region(C.gr.regions[i], x, y)
            ? (!C.hero_inside(C.gr.regions[i])
               && (f_indx = C.gr.regions[i].can_enter_f) != C.NO_CALLBACK)
            : (C.hero_inside(C.gr.regions[i])
               && (f_indx = C.gr.regions[i].can_leave_f) != C.NO_CALLBACK)) {
            if (!callbacks[f_indx](C.gr.regions[i], 0))
                return 0;
        }
    }

    /* Callbacks for the regions hero does leave */
    for (i = 0; i < C.svn.n_regions; i++) {
        if (C.gr.regions[i].attach_2_u)
            continue;
        if (C.hero_inside(C.gr.regions[i])
            && !inside_region(C.gr.regions[i], x, y)) {
            C.clear_hero_inside(C.gr.regions[i]);
            if (C.gr.regions[i].leave_msg != 0)
                C.pline1(C.gr.regions[i].leave_msg);
            if ((f_indx = C.gr.regions[i].leave_f) != C.NO_CALLBACK)
                callbacks[f_indx](C.gr.regions[i], 0);
        }
    }

    /* Callbacks for the regions hero does enter */
    for (i = 0; i < C.svn.n_regions; i++) {
        if (C.gr.regions[i].attach_2_u)
            continue;
        if (!C.hero_inside(C.gr.regions[i])
            && inside_region(C.gr.regions[i], x, y)) {
            C.set_hero_inside(C.gr.regions[i]);
            if (C.gr.regions[i].enter_msg != 0)
                C.pline1(C.gr.regions[i].enter_msg);
            if ((f_indx = C.gr.regions[i].enter_f) != C.NO_CALLBACK)
                callbacks[f_indx](C.gr.regions[i], 0);
        }
    }

    return 1;
}

/*
 * check whether a monster enters/leaves one or more regions.
 */
export function m_in_out_region(mon, x, y)
{
    let i, f_indx = 0;

    /* First check if mon can do the move */
    for (i = 0; i < C.svn.n_regions; i++) {
        if (C.gr.regions[i].attach_2_m == mon.m_id)
            continue;
        if (inside_region(C.gr.regions[i], x, y)
            ? (!mon_in_region(C.gr.regions[i], mon)
               && (f_indx = C.gr.regions[i].can_enter_f) != C.NO_CALLBACK)
            : (mon_in_region(C.gr.regions[i], mon)
               && (f_indx = C.gr.regions[i].can_leave_f) != C.NO_CALLBACK)) {
            if (!callbacks[f_indx](C.gr.regions[i], mon))
                return 0;
        }
    }

    /* Callbacks for the regions mon does leave */
    for (i = 0; i < C.svn.n_regions; i++) {
        if (C.gr.regions[i].attach_2_m == mon.m_id)
            continue;
        if (mon_in_region(C.gr.regions[i], mon)
            && !inside_region(C.gr.regions[i], x, y)) {
            remove_mon_from_reg(C.gr.regions[i], mon);
            if ((f_indx = C.gr.regions[i].leave_f) != C.NO_CALLBACK)
                callbacks[f_indx](C.gr.regions[i], mon);
        }
    }

    /* Callbacks for the regions mon does enter */
    for (i = 0; i < C.svn.n_regions; i++) {
        if (C.gr.regions[i].attach_2_m == mon.m_id)
            continue;
        if (!mon_in_region(C.gr.regions[i], mon)
            && inside_region(C.gr.regions[i], x, y)) {
            add_mon_to_reg(C.gr.regions[i], mon);
            if ((f_indx = C.gr.regions[i].enter_f) != C.NO_CALLBACK)
                callbacks[f_indx](C.gr.regions[i], mon);
        }
    }

    return 1;
}

/*
 * Checks player's regions after a teleport for instance.
 */
export function update_player_regions()
{
    let i;

    for (i = 0; i < C.svn.n_regions; i++)
        if (!C.gr.regions[i].attach_2_u
            && inside_region(C.gr.regions[i], C.u.ux, C.u.uy))
            C.set_hero_inside(C.gr.regions[i]);
        else
            C.clear_hero_inside(C.gr.regions[i]);
}

/*
 * Ditto for a specified monster.
 */
export function update_monster_region(mon)
{
    let i;

    for (i = 0; i < C.svn.n_regions; i++) {
        if (inside_region(C.gr.regions[i], mon.mx, mon.my)) {
            if (!mon_in_region(C.gr.regions[i], mon))
                add_mon_to_reg(C.gr.regions[i], mon);
        } else {
            if (mon_in_region(C.gr.regions[i], mon))
                remove_mon_from_reg(C.gr.regions[i], mon);
        }
    }
}

/*0*/

/* per-turn damage inflicted by visible region; hides details from caller */
export function reg_damg(reg)
{
    let damg = (!reg.visible || reg.ttl == -2n) ? 0 : reg.arg.a_int;

    return damg;
}

/* check whether current level has any visible regions */
export function any_visible_region()
{
    let i;

    for (i = 0; i < C.svn.n_regions; i++) {
        if (!C.gr.regions[i].visible || C.gr.regions[i].ttl == -2n)
            continue;
        return 1;
    }
    return 0;
}

/* for the wizard mode #timeout command */
export function visible_region_summary(win)
{
    let reg;
    const buf = C.stackAlloc(C.BUFSZ), typbuf = C.stackAlloc(C.QBUFSZ);
    let i, damg, hdr_done = 0;
    let fldsep = C.iflags.menu_tab_sep ? "\t" : "  ";

    for (i = 0; i < C.svn.n_regions; i++) {
        reg = C.gr.regions[i];
        if (!reg.visible || reg.ttl == -2n)
            continue;

        if (!hdr_done++) {
            C.putstr(win, 0, "");
            C.putstr(win, 0, "Visible regions");
        }
        /*
         * TODO? sort the regions by time-to-live or by bounding box.
         */

        /* we display relative time (turns left) rather than absolute
           (the turn when region will go away);
           since time-to-live has already been decremented, regions
           which are due to timeout on the next turn have ttl==0;
           adding 1 is intended to make the display be less confusing */
        C.Sprintf(buf, "%5ld", reg.ttl + 1n);
        damg = reg.arg.a_int;
        if (damg)
            C.Sprintf(typbuf, "poison gas (%d)", damg);
        else
            C.Strcpy(typbuf, "vapor");
        C.Sprintf(C.eos(buf), "%s%-16s", fldsep, typbuf);
        C.Sprintf(C.eos(buf), "%s@[%d,%d..%d,%d]", fldsep,
                reg.bounding_box.lx, reg.bounding_box.ly,
                reg.bounding_box.hx, reg.bounding_box.hy);
        C.putstr(win, 0, buf);
    }
}

/*
 * Check if a spot is under a visible region (eg: gas cloud).
 * Returns NULL if not, otherwise returns region.
 */
export function visible_region_at(x, y)
{
    let i;

    for (i = 0; i < C.svn.n_regions; i++) {
        if (!C.gr.regions[i].visible || C.gr.regions[i].ttl == -2n)
            continue;
        if (inside_region(C.gr.regions[i], x, y))
            return C.gr.regions[i];
    }
    return 0;
}

export function show_region(reg, x, y)
{
    C.show_glyph(x, y, reg.glyph);
}

/**
 * save_regions :
 */
export function save_regions(nhfp)
{
    let r;
    let i, j;
    const n = C.uintLocal();

    skip_lots: {
    if (!C.update_file(nhfp))
        break skip_lots;
    /* timestamp */
    C.Sfo_long(nhfp, C.globalField("svm", "moves"), "region-tmstamp");
    C.Sfo_int(nhfp, C.globalField("svn", "n_regions"), "region-region_count");

    for (i = 0; i < C.svn.n_regions; i++) {
        r = C.gr.regions[i];
        C.Sfo_nhrect(nhfp, r.bounding_box, "region-bounding_box");
        C.Sfo_short(nhfp, C.addressOf(r, "nrects"), "region-nrects");
        for (j = 0; j < r.nrects; j++) {
            C.Sfo_nhrect(nhfp, r.rects[j], "region-rect");
        }
        C.Sfo_boolean(nhfp, C.addressOf(r, "attach_2_u"), "region-attach_2_u");
        C.Sfo_unsigned(nhfp, C.addressOf(r, "attach_2_m"), "region-attach_2_m");
        n.value = 0;
        n.value = !r.enter_msg ? 0 : C.strlen(r.enter_msg);
        C.Sfo_unsigned(nhfp, n.address, "region-enter_msg_length");
        if (n.value > 0) {
            C.Sfo_char(nhfp, r.enter_msg,
                     "region-enter_msg", n.value);
        }
        n.value = !r.leave_msg ? 0 : C.strlen(r.leave_msg);
        C.Sfo_unsigned(nhfp, n.address, "region-leave_msg_length");
        if (n.value > 0) {
            C.Sfo_char(nhfp, r.leave_msg, "region-leave_msg", n.value);
        }
        C.Sfo_long(nhfp, C.addressOf(r, "ttl"), "region-ttl");
        C.Sfo_short(nhfp, C.addressOf(r, "expire_f"), "region-expire_f");
        C.Sfo_short(nhfp, C.addressOf(r, "can_enter_f"), "region-can_enter_f");
        C.Sfo_short(nhfp, C.addressOf(r, "enter_f"), "region-enter_f");
        C.Sfo_short(nhfp, C.addressOf(r, "can_leave_f"), "region-can_leave_f");
        C.Sfo_short(nhfp, C.addressOf(r, "leave_f"), "region-leave_f");
        C.Sfo_short(nhfp, C.addressOf(r, "inside_f"), "region-inside_f");
        C.Sfo_unsigned(nhfp, C.addressOf(r, "player_flags"), "region-player_flags");
        C.Sfo_short(nhfp, C.addressOf(r, "n_monst"), "region-monster_count");

        for (j = 0; j < r.n_monst; j++) {
            C.Sfo_unsigned(nhfp, C.elementAddress(r.monsters,j), "region-monster");
        }
        C.Sfo_boolean(nhfp, C.addressOf(r, "visible"), "region-visible");
        C.Sfo_int(nhfp, C.addressOf(r, "glyph"), "region-glyph");
        C.Sfo_any(nhfp, C.addressOf(r, "arg"), "region-arg");
    }

 }
    if (C.release_data(nhfp))
        clear_regions();
}
/* !SFCTOOL */

export function rest_regions(nhfp)
{
    let r;
    let i, j;
    const n = C.uintLocal(0);
    const tmstamp = C.longLocal(0n);
    let msg_buf;
    let ghostly = (nhfp.ftype == C.NHF_BONESFILE);

    clear_regions(); /* Just for security */
    C.Sfi_long(nhfp, tmstamp.address, "region-tmstamp");
    if (ghostly)
        tmstamp.value = 0;
    else
        tmstamp.value = (C.svm.moves - tmstamp.value);
    C.Sfi_int(nhfp, C.globalField("svn", "n_regions"), "region-region_count");
    C.gm.max_regions = C.svn.n_regions;
    if (C.svn.n_regions > 0)
        C.gr.regions = C.regionArray(C.alloc(C.svn.n_regions * C.pointerSize));
    for (i = 0; i < C.svn.n_regions; i++) {
        r = C.region(C.alloc(C.regionSize));
        C.gr.regions[i] = r;
        C.Sfi_nhrect(nhfp, r.bounding_box, "region-bounding box");
        C.Sfi_short(nhfp, C.addressOf(r, "nrects"), "region-nrects");
        if (r.nrects > 0)
            r.rects = C.rectArray(C.alloc(r.nrects * C.rectSize));
        else
            r.rects = 0;
        for (j = 0; j < r.nrects; j++) {
           C.Sfi_nhrect(nhfp, r.rects[j], "region-rect");
        }

        C.Sfi_boolean(nhfp, C.addressOf(r, "attach_2_u"), "region-attach_2_u");
        C.Sfi_unsigned(nhfp, C.addressOf(r, "attach_2_m"), "region-attach_2_m");
        C.Sfi_unsigned(nhfp, n.address, "region-enter_msg_length");
        if (n.value > 0) {
            msg_buf = C.alloc(n.value + 1);
            C.Sfi_char(nhfp, msg_buf, "region-enter_msg", n.value);
            C.storeChar(msg_buf + n.value, ('\0').charCodeAt(0));
        } else {
            msg_buf = 0;
        }
        r.enter_msg = msg_buf;

        C.Sfi_unsigned(nhfp, n.address, "region-leave_msg_length");
        if (n.value > 0) {
            msg_buf = C.alloc(n.value + 1);
            C.Sfi_char(nhfp, msg_buf, "region-leave_msg", n.value);
            C.storeChar(msg_buf + n.value, ('\0').charCodeAt(0));
            r.leave_msg = msg_buf;
        } else {
            msg_buf = 0;
        }
        r.leave_msg = msg_buf;

        C.Sfi_long(nhfp, C.addressOf(r, "ttl"), "region-ttl");
        /* check for expired region */
        if (r.ttl >= 0n)
            r.ttl = (r.ttl > tmstamp.value) ? r.ttl - tmstamp.value : 0n;
        C.Sfi_short(nhfp, C.addressOf(r, "expire_f"), "region-expire_f");
        C.Sfi_short(nhfp, C.addressOf(r, "can_enter_f"), "region-can_enter_f");
        C.Sfi_short(nhfp, C.addressOf(r, "enter_f"), "region-enter_f");
        C.Sfi_short(nhfp, C.addressOf(r, "can_leave_f"), "region-can_leave_f");
        C.Sfi_short(nhfp, C.addressOf(r, "leave_f"), "region-leave_f");
        C.Sfi_short(nhfp, C.addressOf(r, "inside_f"), "region-inside_f");
        C.Sfi_unsigned(nhfp, C.addressOf(r, "player_flags"), "region-player_flags");
        if (ghostly) { /* settings pertained to old player */
            C.clear_hero_inside(r);
            C.clear_heros_fault(r);
        }
        C.Sfi_short(nhfp, C.addressOf(r, "n_monst"), "region-monster_count");
        if (r.n_monst > 0)
            r.monsters = C.uintArray(C.alloc(r.n_monst * C.unsignedSize));
        else
            r.monsters = 0;
        r.max_monst = r.n_monst;
        for (j = 0; j < r.n_monst; j++) {
            C.Sfi_unsigned(nhfp, C.elementAddress(r.monsters,j), "region-monster");
        }
        C.Sfi_boolean(nhfp, C.addressOf(r, "visible"), "region-visible");
        C.Sfi_int(nhfp, C.addressOf(r, "glyph"), "region-glyph");
        C.Sfi_any(nhfp, C.addressOf(r, "arg"), "region-arg");
    }
    /* remove expired regions, do not trigger the expire_f callback (yet!);
       also update monster lists if this data is coming from a bones file */
    for (i = C.svn.n_regions - 1; i >= 0; i--) {
        r = C.gr.regions[i];
        if (r.ttl == 0n)
            remove_region(r);
        else if (ghostly && r.n_monst > 0)
            reset_region_mids(r);
    }
/* !SFCTOOL */
}



/* to support '#stats' wizard-mode command */
export function region_stats(hdrfmt, hdrbuf, count, size)
{
    let rg;
    let i;

    /* other stats formats take one parameter; this takes two */
    C.Sprintf(hdrbuf, hdrfmt, BigInt(C.regionSize), BigInt(C.rectSize));
    count.value = BigInt(C.svn.n_regions); /* might be 0 even tho max_regions isn't */
    size.value = BigInt(C.gm.max_regions) * BigInt(C.regionSize);
    for (i = 0; i < C.svn.n_regions; ++i) {
        rg = C.gr.regions[i];
        size.value += BigInt(rg.nrects) * BigInt(C.rectSize);
        if (rg.enter_msg)
            size.value += BigInt(C.strlen(rg.enter_msg) + 1);
        if (rg.leave_msg)
            size.value += BigInt(C.strlen(rg.leave_msg) + 1);
        size.value += BigInt(rg.max_monst) * BigInt(C.unsignedSize);
    }
    /* ? */
}



/* update monster IDs for region being loaded from bones; `ghostly' implied */
export function reset_region_mids(reg)
{
    let i = 0, n = reg.n_monst;
    let mid_list = reg.monsters;

    while (i < n)
        if (!C.lookup_id_mapping(mid_list[i], C.elementAddress(mid_list,i))) {
            /* shrink list to remove missing monster; order doesn't matter */
            mid_list[i] = mid_list[--n];
        } else {
            /* move on to next monster */
            ++i;
        }
    reg.n_monst = n;
    return;
}

/*0*/

/*--------------------------------------------------------------*
 *                                                              *
 *                      Gas cloud related code                  *
 *                                                              *
 *--------------------------------------------------------------*/

/*
 * Here is an example of an expire function that may prolong
 * region life after some mods...
 */
/*ARGSUSED*/
export function expire_gas_cloud(p1, p2)
{
    let reg;
    let damage, pass;
    let x, y;

    reg = p1;
    damage = reg.arg.a_int;

    /* If it was a thick cloud, it dissipates a little first */
    if (damage >= 5) {
        damage = Math.trunc(damage / 2); /* It dissipates, let's do less damage */
        C.copyAny(reg.arg, C.cg.zeroany);
        reg.arg.a_int = damage;
        reg.ttl = 2n; /* Here's the trick : reset ttl */
        return 0;  /* THEN return FALSE, means "still there" */
    }

    /* The cloud no longer blocks vision.  cansee() checks shouldn't be made
       until all blocked spots have been unblocked, so we need two passes */
    for (pass = 1; pass <= (C.Blind ? 1 : 2); ++pass) {
        for (x = reg.bounding_box.lx; x <= reg.bounding_box.hx; x++) {
            for (y = reg.bounding_box.ly; y <= reg.bounding_box.hy; y++) {
                if (inside_region(reg, x, y)) {
                    if (pass == 1) {
                        if (!C.does_block(x, y, C.terrain(x,y)))
                            C.unblock_point(x, y);
                    } else { /* pass==2 */
                        if (!C.u.uswallow) {
                            if (C.u_at(x, y))
                                C.gg.gas_cloud_diss_within = 1;
                            else if (C.cansee(x, y))
                                C.gg.gas_cloud_diss_seen++;
                        }
                    }
                }
            }
        }
    }

    return 1; /* OK, it's gone, you can free it! */
}

/* returns True if p2 is killed by region p1, False otherwise */
export function inside_gas_cloud(p1, p2)
{
    let reg = p1;
    let mtmp = p2;
    let umon = mtmp ? mtmp : C.gy.youmonst;
    let dam = reg.arg.a_int;

    /*
     * Gas clouds can't be targeted at water locations, but they can
     * start next to water and spread over it.
     */

    /* fog clouds maintain gas clouds, even poisonous ones */
    if (reg.ttl < 20 && umon && umon.data == C.mons[C.PM_FOG_CLOUD])
        reg.ttl += 5n;

    if (dam < 1)
        return 0; /* if no damage then there's nothing to do here... */

    if (!mtmp) { /* hero is indicated by Null rather than by &youmonst */
        if (C.m_poisongas_ok(C.gy.youmonst) == C.M_POISONGAS_OK)
            return 0;
        if (!C.Blind) {
            C.Your("%s sting.", C.makeplural(C.body_part(C.EYE)));
            C.make_blinded(1n, 0);
        }
        if (!C.Poison_resistance) {
            C.pline("%s is burning your %s!", C.Something,
                  C.makeplural(C.body_part(C.LUNG)));
            C.You("cough and spit blood!");
            C.wake_nearto(C.u.ux, C.u.uy, 2);
            dam = C.Half_physical_damage ? Math.trunc((C.rnd(dam,1122) + 5 + 1) / 2) : C.rnd(dam,1122) + 5;
            if (C.Half_gas_damage) /* worn towel */
                dam = Math.trunc((dam + 1) / 2);
            C.losehp(dam, "gas cloud", C.KILLED_BY_AN);
            C.monstunseesu(C.M_SEEN_POISON);
            return 0;
        } else {
            C.You("cough!");
            C.wake_nearto(C.u.ux, C.u.uy, 2);
            C.monstseesu(C.M_SEEN_POISON);
            return 0;
        }
    } else { /* A monster is inside the cloud */
        mtmp = p2;

        if (C.m_poisongas_ok(mtmp) != C.M_POISONGAS_OK) {
            if (!C.is_silent(mtmp.data)) {
                if (C.cansee(mtmp.mx, mtmp.my)
                    || (C.distu(mtmp.mx, mtmp.my) < 8))
                    C.pline("%s coughs!", C.Monnam(mtmp));
                C.wake_nearto(mtmp.mx, mtmp.my, 2);
            }
            if (C.heros_fault(reg))
                C.setmangry(mtmp, 1);
            if (C.haseyes(mtmp.data) && mtmp.mcansee) {
                mtmp.mblinded = 1;
                mtmp.mcansee = 0;
            }
            if (C.resists_poison(mtmp))
                return 0;
            mtmp.mhp -= C.rnd(dam,1152) + 5;
            if (C.DEADMONSTER(mtmp)) {
                if (C.heros_fault(reg))
                    C.killed(mtmp);
                else
                    C.monkilled(mtmp, "gas cloud", C.AD_DRST);
                if (C.DEADMONSTER(mtmp)) { /* not lifesaved */
                    return 1;
                }
            }
        }
    }
    return 0; /* Monster is still alive */
}

export function is_hero_inside_gas_cloud()
{
    let i;

    for (i = 0; i < C.svn.n_regions; i++)
        if (C.hero_inside(C.gr.regions[i])
            && C.gr.regions[i].inside_f == C.INSIDE_GAS_CLOUD)
            return 1;
    return 0;
}

/* details of gas cloud creation which are common to create_gas_cloud()
   and create_gas_cloud_selection() */
export function make_gas_cloud(cloud, damage, inside_cloud)
{
    if (!C.gi.in_mklev && !C.svc.context.mon_moving)
        C.set_heros_fault(cloud); /* assume player has created it */
    cloud.inside_f = C.INSIDE_GAS_CLOUD;
    cloud.expire_f = C.EXPIRE_GAS_CLOUD;
    C.copyAny(cloud.arg, C.cg.zeroany);
    cloud.arg.a_int = damage;
    cloud.visible = 1;
    cloud.glyph = C.cmap_to_glyph(damage ? C.S_poisoncloud : C.S_cloud);
    add_region(cloud);

    if (!C.gi.in_mklev && !inside_cloud && is_hero_inside_gas_cloud()) {
        C.You("are enveloped in a cloud of %s!",
            /* FIXME: "steam" is wrong if this cloud is just the trail of
               a fog cloud's movement; changing to "vapor" would handle
               that but seems a step backward when it really is steam */
            damage ? "noxious gas" : "steam");
        C.iflags.last_msg = C.PLNMSG_ENVELOPED_IN_GAS;
    }
}

/* Create a gas cloud which starts at (x,y) and grows outward from it via
 * breadth-first search.
 * cloudsize is the number of squares the cloud will attempt to fill.
 * damage is how much it deals to afflicted creatures. */
export function create_gas_cloud(x, y, cloudsize, damage)
{
    let cloud;
    let i, j;
    const tmprect = C.rectLocal();

    /* store visited coords */
    const xcoords = new Int16Array(C.MAX_CLOUD_SIZE);
    const ycoords = new Int16Array(C.MAX_CLOUD_SIZE);
    xcoords[0] = x;
    ycoords[0] = y;
    let curridx;
    let newidx = 1; /* initial spot is already taken */
    let inside_cloud = is_hero_inside_gas_cloud();

    /* a single-point cloud on hero and it deals no damage.
       probably a natural cause of being polyed. don't message about it */
    if (!C.svc.context.mon_moving && C.u_at(x, y) && cloudsize == 1
        && (!damage
            || (damage && C.m_poisongas_ok(C.gy.youmonst) == C.M_POISONGAS_OK)))
        inside_cloud = 1;

    if (cloudsize > C.MAX_CLOUD_SIZE) {
        C.impossible("create_gas_cloud: cloud too large (%d)!", cloudsize);
        cloudsize = C.MAX_CLOUD_SIZE;
    }

    for (curridx = 0; curridx < newidx; curridx++) {
        if (newidx >= cloudsize)
            break;
    let xx = xcoords[curridx];
    let yy = ycoords[curridx];
        /* Do NOT check for if there is already a gas cloud created at some
         * other time at this position. They can overlap. */

        /* Primitive Fisher-Yates-Knuth shuffle to randomize the order of
         * directions chosen. */
        const dirs = [ {x:0,y:-1}, {x:0,y:1}, {x:-1,y:0}, {x:1,y:0} ];
        for (i = 4; i > 0; --i) {
    let swapidx = C.rn2(i,1255);
            let tmp = dirs[swapidx];

            dirs[swapidx] = dirs[i - 1];
            dirs[i - 1] = tmp;
        }
    let nvalid = 0; /* # of valid adjacent spots */
        for (i = 0; i < 4; ++i) {
            /* try all 4 cardinal directions */
    let dx = dirs[i].x, dy = dirs[i].y;
    let isunpicked = 1;

            if (C.valid_cloud_pos(xx + dx, yy + dy)) {
                nvalid++;
                /* don't pick a location we've already picked */
                for (j = 0; j < newidx; ++j) {
                    if (xcoords[j] == xx + dx && ycoords[j] == yy + dy) {
                        isunpicked = 0;
                        break;
                    }
                }
                /* randomly disrupt the natural breadth-first search, so that
                 * clouds released in open spaces don't always tend towards a
                 * rhombus shape */
                if (nvalid == 4 && !C.rn2(2,1279))
                    continue;

                if (isunpicked) {
                    xcoords[newidx] = xx + dx;
                    ycoords[newidx] = yy + dy;
                    newidx++;
                }
            }
            if (newidx >= cloudsize) {
                /* don't try further directions */
                break;
            }
        }
    }
    /* We have now either filled up xcoord and ycoord entirely or run out
       of space.  In either case, newidx is the correct total number of
       coordinates inserted. */
    cloud = create_region(0, 0);
    for (i = 0; i < newidx; ++i) {
        tmprect.lx = tmprect.hx = xcoords[i];
        tmprect.ly = tmprect.hy = ycoords[i];
        add_rect_to_reg(cloud, tmprect);
    }
    cloud.ttl = BigInt(C.rn1(3, 4,1303));
    /* If cloud was constrained in small space, give it more time to live. */
    cloud.ttl = C.long(cloud.ttl * BigInt(cloudsize)) / BigInt(newidx);

    make_gas_cloud(cloud, damage, inside_cloud);
    return cloud;
}

/* create a single gas cloud from selection */
export function create_gas_cloud_selection(sel, damage)
{
    let cloud;
    const tmprect = C.rectLocal();
    let x, y;
    const r = C.rectLocal(C.cg.zeroNhRect);
    let inside_cloud = is_hero_inside_gas_cloud();

    C.selection_getbounds(sel, r);

    cloud = create_region(0, 0);
    for (x = r.lx; x <= r.hx; x++)
        for (y = r.ly; y <= r.hy; y++)
            if (C.selection_getpoint(x, y, sel)) {
                tmprect.lx = tmprect.hx = x;
                tmprect.ly = tmprect.hy = y;
                add_rect_to_reg(cloud, tmprect);
            }

    make_gas_cloud(cloud, damage, inside_cloud);
    return cloud;
}


/* for checking troubles during prayer; is hero at risk? */
export function region_danger()
{
    let i, f_indx, n = 0;

    for (i = 0; i < C.svn.n_regions; i++) {
        /* only care about regions that hero is in */
        if (!C.hero_inside(C.gr.regions[i]))
            continue;
        f_indx = C.gr.regions[i].inside_f;
        /* the only type of region we understand is gas_cloud */
        if (f_indx == C.INSIDE_GAS_CLOUD) {
            /* completely harmless if you don't need to breathe */
            if (C.nonliving(C.gy.youmonst.data) || C.Breathless)
                continue;
            /* minor inconvenience if you're poison resistant;
               not harmful enough to be a prayer-level trouble */
            if (C.Poison_resistance)
                continue;
            ++n;
        }
    }
    return n ? 1 : 0;
}

/* for fixing trouble at end of prayer;
   danger detected at start of prayer might have expired by now */
export function region_safety()
{
    let r = 0;
    let i, f_indx, n = 0;

    for (i = 0; i < C.svn.n_regions; i++) {
        /* only care about regions that hero is in */
        if (!C.hero_inside(C.gr.regions[i]))
            continue;
        f_indx = C.gr.regions[i].inside_f;
        /* the only type of region we understand is gas_cloud */
        if (f_indx == C.INSIDE_GAS_CLOUD) {
            if (!n++ && C.gr.regions[i].ttl >= 0)
                r = C.gr.regions[i];
        }
    }

    if (n > 1 || (n == 1 && !r)) {
        /* multiple overlapping cloud regions or non-expiring one */
        C.safe_teleds(C.TELEDS_NO_FLAGS);
        /* maybe there's no safe place available; must get hero out of danger
           or prayer's "fix all troubles" result will get stuck in a loop */
        if (region_danger()) {
            C.set_itimeout(C.magicalBreathingAddress(), BigInt(C.d(4, 4,1391) + 4));
            /* not already Breathless or wouldn't be in region danger */
            C.You_feel("able to breathe.");
        }
    } else if (r) {
        remove_region(r);
        C.pline_The("gas cloud enveloping you dissipates.");
    } else {
        /* cloud dissipated on its own, so nothing needs to be done */
        C.pline_The("gas cloud has dissipated.");
    }
    /* maybe cure blindness too */
    if (C.BlindedTimeout == 1n)
        C.make_blinded(0n, 1);
}
/* !SFCTOOL */

/*region.c*/
/* not yet used */

/*
 * Clone (make a standalone copy) the region.
 */

/* ret_reg->attach_2_o = reg->attach_2_o; */

/* set/clear_hero_inside,&c*/

/* leave this bit (to exclude long worm tails) out;
                       assume that worms use "cutaneous respiration" (they
                       breath through their skin rather than nose/gills/&c)
                       so their tails are susceptible to poison gas */

/*
 * Change monster pointer in gr.regions
 * This happens, for instance, when a monster grows and
 * need a new structure (internally that is).
 */

/*
 * Remove monster from all regions it was in (ie monster just died)
 */

/*--------------------------------------------------------------*
 *                                                              *
 *                      Create Region with just a message       *
 *                                                              *
 *--------------------------------------------------------------*/

/*--------------------------------------------------------------*
 *                                                              *
 *                      Force Field Related Cod                 *
 *                      (unused yet)                            *
 *--------------------------------------------------------------*/

/* That means the player */

/* ff->can_enter_f = enter_force_field; */

/* ff->can_leave_f = enter_force_field; */

/* not yet used */

/* not yet used */

/* assume player has created it */
