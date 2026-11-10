/* NetHack 5.0	sfstruct.c	$NHDT-Date: 1606765215 2020/11/30 19:40:15 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.4 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Michael Allison, 2025. */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from './c-runtime.js';

/* #define SFLOGGING */          /* debugging */

/* historical full struct savings */
// SF_A/SF_C/SF_X are expanded below into their original native functions.

export function historical_sfo_arti_info(nhfp, d_arti_info, myname)
{
    C.norm_ptrs_arti_info(d_arti_info);
    bwrite(nhfp.fd, d_arti_info, C.type_arti_info_size);
}

export function historical_sfi_arti_info(nhfp, d_arti_info, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_arti_info, C.type_arti_info_size);
    C.norm_ptrs_arti_info(d_arti_info);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_nhrect(nhfp, d_nhrect, myname)
{
    C.norm_ptrs_nhrect(d_nhrect);
    bwrite(nhfp.fd, d_nhrect, C.type_nhrect_size);
}

export function historical_sfi_nhrect(nhfp, d_nhrect, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_nhrect, C.type_nhrect_size);
    C.norm_ptrs_nhrect(d_nhrect);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_branch(nhfp, d_branch, myname)
{
    C.norm_ptrs_branch(d_branch);
    bwrite(nhfp.fd, d_branch, C.type_branch_size);
}

export function historical_sfi_branch(nhfp, d_branch, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_branch, C.type_branch_size);
    C.norm_ptrs_branch(d_branch);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_bubble(nhfp, d_bubble, myname)
{
    C.norm_ptrs_bubble(d_bubble);
    bwrite(nhfp.fd, d_bubble, C.type_bubble_size);
}

export function historical_sfi_bubble(nhfp, d_bubble, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_bubble, C.type_bubble_size);
    C.norm_ptrs_bubble(d_bubble);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_cemetery(nhfp, d_cemetery, myname)
{
    C.norm_ptrs_cemetery(d_cemetery);
    bwrite(nhfp.fd, d_cemetery, C.type_cemetery_size);
}

export function historical_sfi_cemetery(nhfp, d_cemetery, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_cemetery, C.type_cemetery_size);
    C.norm_ptrs_cemetery(d_cemetery);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_context_info(nhfp, d_context_info, myname)
{
    C.norm_ptrs_context_info(d_context_info);
    bwrite(nhfp.fd, d_context_info, C.type_context_info_size);
}

export function historical_sfi_context_info(nhfp, d_context_info, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_context_info, C.type_context_info_size);
    C.norm_ptrs_context_info(d_context_info);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_nhcoord(nhfp, d_nhcoord, myname)
{
    C.norm_ptrs_nhcoord(d_nhcoord);
    bwrite(nhfp.fd, d_nhcoord, C.type_nhcoord_size);
}

export function historical_sfi_nhcoord(nhfp, d_nhcoord, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_nhcoord, C.type_nhcoord_size);
    C.norm_ptrs_nhcoord(d_nhcoord);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_damage(nhfp, d_damage, myname)
{
    C.norm_ptrs_damage(d_damage);
    bwrite(nhfp.fd, d_damage, C.type_damage_size);
}

export function historical_sfi_damage(nhfp, d_damage, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_damage, C.type_damage_size);
    C.norm_ptrs_damage(d_damage);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_dest_area(nhfp, d_dest_area, myname)
{
    C.norm_ptrs_dest_area(d_dest_area);
    bwrite(nhfp.fd, d_dest_area, C.type_dest_area_size);
}

export function historical_sfi_dest_area(nhfp, d_dest_area, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_dest_area, C.type_dest_area_size);
    C.norm_ptrs_dest_area(d_dest_area);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_dgn_topology(nhfp, d_dgn_topology, myname)
{
    C.norm_ptrs_dgn_topology(d_dgn_topology);
    bwrite(nhfp.fd, d_dgn_topology, C.type_dgn_topology_size);
}

export function historical_sfi_dgn_topology(nhfp, d_dgn_topology, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_dgn_topology, C.type_dgn_topology_size);
    C.norm_ptrs_dgn_topology(d_dgn_topology);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_dungeon(nhfp, d_dungeon, myname)
{
    C.norm_ptrs_dungeon(d_dungeon);
    bwrite(nhfp.fd, d_dungeon, C.type_dungeon_size);
}

export function historical_sfi_dungeon(nhfp, d_dungeon, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_dungeon, C.type_dungeon_size);
    C.norm_ptrs_dungeon(d_dungeon);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_d_level(nhfp, d_d_level, myname)
{
    C.norm_ptrs_d_level(d_d_level);
    bwrite(nhfp.fd, d_d_level, C.type_d_level_size);
}

export function historical_sfi_d_level(nhfp, d_d_level, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_d_level, C.type_d_level_size);
    C.norm_ptrs_d_level(d_d_level);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_ebones(nhfp, d_ebones, myname)
{
    C.norm_ptrs_ebones(d_ebones);
    bwrite(nhfp.fd, d_ebones, C.type_ebones_size);
}

export function historical_sfi_ebones(nhfp, d_ebones, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_ebones, C.type_ebones_size);
    C.norm_ptrs_ebones(d_ebones);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_edog(nhfp, d_edog, myname)
{
    C.norm_ptrs_edog(d_edog);
    bwrite(nhfp.fd, d_edog, C.type_edog_size);
}

export function historical_sfi_edog(nhfp, d_edog, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_edog, C.type_edog_size);
    C.norm_ptrs_edog(d_edog);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_egd(nhfp, d_egd, myname)
{
    C.norm_ptrs_egd(d_egd);
    bwrite(nhfp.fd, d_egd, C.type_egd_size);
}

export function historical_sfi_egd(nhfp, d_egd, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_egd, C.type_egd_size);
    C.norm_ptrs_egd(d_egd);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_emin(nhfp, d_emin, myname)
{
    C.norm_ptrs_emin(d_emin);
    bwrite(nhfp.fd, d_emin, C.type_emin_size);
}

export function historical_sfi_emin(nhfp, d_emin, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_emin, C.type_emin_size);
    C.norm_ptrs_emin(d_emin);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_engr(nhfp, d_engr, myname)
{
    C.norm_ptrs_engr(d_engr);
    bwrite(nhfp.fd, d_engr, C.type_engr_size);
}

export function historical_sfi_engr(nhfp, d_engr, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_engr, C.type_engr_size);
    C.norm_ptrs_engr(d_engr);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_epri(nhfp, d_epri, myname)
{
    C.norm_ptrs_epri(d_epri);
    bwrite(nhfp.fd, d_epri, C.type_epri_size);
}

export function historical_sfi_epri(nhfp, d_epri, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_epri, C.type_epri_size);
    C.norm_ptrs_epri(d_epri);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_eshk(nhfp, d_eshk, myname)
{
    C.norm_ptrs_eshk(d_eshk);
    bwrite(nhfp.fd, d_eshk, C.type_eshk_size);
}

export function historical_sfi_eshk(nhfp, d_eshk, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_eshk, C.type_eshk_size);
    C.norm_ptrs_eshk(d_eshk);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_fe(nhfp, d_fe, myname)
{
    C.norm_ptrs_fe(d_fe);
    bwrite(nhfp.fd, d_fe, C.type_fe_size);
}

export function historical_sfi_fe(nhfp, d_fe, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_fe, C.type_fe_size);
    C.norm_ptrs_fe(d_fe);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_flag(nhfp, d_flag, myname)
{
    C.norm_ptrs_flag(d_flag);
    bwrite(nhfp.fd, d_flag, C.type_flag_size);
}

export function historical_sfi_flag(nhfp, d_flag, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_flag, C.type_flag_size);
    C.norm_ptrs_flag(d_flag);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_fruit(nhfp, d_fruit, myname)
{
    C.norm_ptrs_fruit(d_fruit);
    bwrite(nhfp.fd, d_fruit, C.type_fruit_size);
}

export function historical_sfi_fruit(nhfp, d_fruit, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_fruit, C.type_fruit_size);
    C.norm_ptrs_fruit(d_fruit);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_gamelog_line(nhfp, d_gamelog_line, myname)
{
    C.norm_ptrs_gamelog_line(d_gamelog_line);
    bwrite(nhfp.fd, d_gamelog_line, C.type_gamelog_line_size);
}

export function historical_sfi_gamelog_line(nhfp, d_gamelog_line, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_gamelog_line, C.type_gamelog_line_size);
    C.norm_ptrs_gamelog_line(d_gamelog_line);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_kinfo(nhfp, d_kinfo, myname)
{
    C.norm_ptrs_kinfo(d_kinfo);
    bwrite(nhfp.fd, d_kinfo, C.type_kinfo_size);
}

export function historical_sfi_kinfo(nhfp, d_kinfo, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_kinfo, C.type_kinfo_size);
    C.norm_ptrs_kinfo(d_kinfo);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_levelflags(nhfp, d_levelflags, myname)
{
    C.norm_ptrs_levelflags(d_levelflags);
    bwrite(nhfp.fd, d_levelflags, C.type_levelflags_size);
}

export function historical_sfi_levelflags(nhfp, d_levelflags, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_levelflags, C.type_levelflags_size);
    C.norm_ptrs_levelflags(d_levelflags);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_ls_t(nhfp, d_ls_t, myname)
{
    C.norm_ptrs_ls_t(d_ls_t);
    bwrite(nhfp.fd, d_ls_t, C.type_ls_t_size);
}

export function historical_sfi_ls_t(nhfp, d_ls_t, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_ls_t, C.type_ls_t_size);
    C.norm_ptrs_ls_t(d_ls_t);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_linfo(nhfp, d_linfo, myname)
{
    C.norm_ptrs_linfo(d_linfo);
    bwrite(nhfp.fd, d_linfo, C.type_linfo_size);
}

export function historical_sfi_linfo(nhfp, d_linfo, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_linfo, C.type_linfo_size);
    C.norm_ptrs_linfo(d_linfo);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_mapseen_feat(nhfp, d_mapseen_feat, myname)
{
    C.norm_ptrs_mapseen_feat(d_mapseen_feat);
    bwrite(nhfp.fd, d_mapseen_feat, C.type_mapseen_feat_size);
}

export function historical_sfi_mapseen_feat(nhfp, d_mapseen_feat, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_mapseen_feat, C.type_mapseen_feat_size);
    C.norm_ptrs_mapseen_feat(d_mapseen_feat);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_mapseen_flags(nhfp, d_mapseen_flags, myname)
{
    C.norm_ptrs_mapseen_flags(d_mapseen_flags);
    bwrite(nhfp.fd, d_mapseen_flags, C.type_mapseen_flags_size);
}

export function historical_sfi_mapseen_flags(nhfp, d_mapseen_flags, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_mapseen_flags, C.type_mapseen_flags_size);
    C.norm_ptrs_mapseen_flags(d_mapseen_flags);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_mapseen_rooms(nhfp, d_mapseen_rooms, myname)
{
    C.norm_ptrs_mapseen_rooms(d_mapseen_rooms);
    bwrite(nhfp.fd, d_mapseen_rooms, C.type_mapseen_rooms_size);
}

export function historical_sfi_mapseen_rooms(nhfp, d_mapseen_rooms, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_mapseen_rooms, C.type_mapseen_rooms_size);
    C.norm_ptrs_mapseen_rooms(d_mapseen_rooms);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_mkroom(nhfp, d_mkroom, myname)
{
    C.norm_ptrs_mkroom(d_mkroom);
    bwrite(nhfp.fd, d_mkroom, C.type_mkroom_size);
}

export function historical_sfi_mkroom(nhfp, d_mkroom, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_mkroom, C.type_mkroom_size);
    C.norm_ptrs_mkroom(d_mkroom);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_monst(nhfp, d_monst, myname)
{
    C.norm_ptrs_monst(d_monst);
    bwrite(nhfp.fd, d_monst, C.type_monst_size);
}

export function historical_sfi_monst(nhfp, d_monst, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_monst, C.type_monst_size);
    C.norm_ptrs_monst(d_monst);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_mvitals(nhfp, d_mvitals, myname)
{
    C.norm_ptrs_mvitals(d_mvitals);
    bwrite(nhfp.fd, d_mvitals, C.type_mvitals_size);
}

export function historical_sfi_mvitals(nhfp, d_mvitals, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_mvitals, C.type_mvitals_size);
    C.norm_ptrs_mvitals(d_mvitals);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_obj(nhfp, d_obj, myname)
{
    C.norm_ptrs_obj(d_obj);
    bwrite(nhfp.fd, d_obj, C.type_obj_size);
}

export function historical_sfi_obj(nhfp, d_obj, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_obj, C.type_obj_size);
    C.norm_ptrs_obj(d_obj);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_objclass(nhfp, d_objclass, myname)
{
    C.norm_ptrs_objclass(d_objclass);
    bwrite(nhfp.fd, d_objclass, C.type_objclass_size);
}

export function historical_sfi_objclass(nhfp, d_objclass, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_objclass, C.type_objclass_size);
    C.norm_ptrs_objclass(d_objclass);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_q_score(nhfp, d_q_score, myname)
{
    C.norm_ptrs_q_score(d_q_score);
    bwrite(nhfp.fd, d_q_score, C.type_q_score_size);
}

export function historical_sfi_q_score(nhfp, d_q_score, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_q_score, C.type_q_score_size);
    C.norm_ptrs_q_score(d_q_score);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_rm(nhfp, d_rm, myname)
{
    C.norm_ptrs_rm(d_rm);
    bwrite(nhfp.fd, d_rm, C.type_rm_size);
}

export function historical_sfi_rm(nhfp, d_rm, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_rm, C.type_rm_size);
    C.norm_ptrs_rm(d_rm);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_spell(nhfp, d_spell, myname)
{
    C.norm_ptrs_spell(d_spell);
    bwrite(nhfp.fd, d_spell, C.type_spell_size);
}

export function historical_sfi_spell(nhfp, d_spell, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_spell, C.type_spell_size);
    C.norm_ptrs_spell(d_spell);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_stairway(nhfp, d_stairway, myname)
{
    C.norm_ptrs_stairway(d_stairway);
    bwrite(nhfp.fd, d_stairway, C.type_stairway_size);
}

export function historical_sfi_stairway(nhfp, d_stairway, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_stairway, C.type_stairway_size);
    C.norm_ptrs_stairway(d_stairway);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_s_level(nhfp, d_s_level, myname)
{
    C.norm_ptrs_s_level(d_s_level);
    bwrite(nhfp.fd, d_s_level, C.type_s_level_size);
}

export function historical_sfi_s_level(nhfp, d_s_level, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_s_level, C.type_s_level_size);
    C.norm_ptrs_s_level(d_s_level);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_trap(nhfp, d_trap, myname)
{
    C.norm_ptrs_trap(d_trap);
    bwrite(nhfp.fd, d_trap, C.type_trap_size);
}

export function historical_sfi_trap(nhfp, d_trap, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_trap, C.type_trap_size);
    C.norm_ptrs_trap(d_trap);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_you(nhfp, d_you, myname)
{
    C.norm_ptrs_you(d_you);
    bwrite(nhfp.fd, d_you, C.type_you_size);
}

export function historical_sfi_you(nhfp, d_you, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_you, C.type_you_size);
    C.norm_ptrs_you(d_you);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_any(nhfp, d_any, myname)
{
    C.norm_ptrs_any(d_any);
    bwrite(nhfp.fd, d_any, C.type_any_size);
}

export function historical_sfi_any(nhfp, d_any, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_any, C.type_any_size);
    C.norm_ptrs_any(d_any);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_aligntyp(nhfp, d_aligntyp, myname)
{
    bwrite(nhfp.fd, d_aligntyp, C.type_aligntyp_size);
}

export function historical_sfi_aligntyp(nhfp, d_aligntyp, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_aligntyp, C.type_aligntyp_size);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_boolean(nhfp, d_boolean, myname)
{
    bwrite(nhfp.fd, d_boolean, C.type_boolean_size);
}

export function historical_sfi_boolean(nhfp, d_boolean, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_boolean, C.type_boolean_size);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_coordxy(nhfp, d_coordxy, myname)
{
    bwrite(nhfp.fd, d_coordxy, C.type_coordxy_size);
}

export function historical_sfi_coordxy(nhfp, d_coordxy, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_coordxy, C.type_coordxy_size);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_int(nhfp, d_int, myname)
{
    bwrite(nhfp.fd, d_int, C.type_int_size);
}

export function historical_sfi_int(nhfp, d_int, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_int, C.type_int_size);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_int16(nhfp, d_int16, myname)
{
    bwrite(nhfp.fd, d_int16, C.type_int16_size);
}

export function historical_sfi_int16(nhfp, d_int16, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_int16, C.type_int16_size);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_int32(nhfp, d_int32, myname)
{
    bwrite(nhfp.fd, d_int32, C.type_int32_size);
}

export function historical_sfi_int32(nhfp, d_int32, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_int32, C.type_int32_size);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_int64(nhfp, d_int64, myname)
{
    bwrite(nhfp.fd, d_int64, C.type_int64_size);
}

export function historical_sfi_int64(nhfp, d_int64, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_int64, C.type_int64_size);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_long(nhfp, d_long, myname)
{
    bwrite(nhfp.fd, d_long, C.type_long_size);
}

export function historical_sfi_long(nhfp, d_long, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_long, C.type_long_size);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_schar(nhfp, d_schar, myname)
{
    bwrite(nhfp.fd, d_schar, C.type_schar_size);
}

export function historical_sfi_schar(nhfp, d_schar, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_schar, C.type_schar_size);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_short(nhfp, d_short, myname)
{
    bwrite(nhfp.fd, d_short, C.type_short_size);
}

export function historical_sfi_short(nhfp, d_short, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_short, C.type_short_size);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_size_t(nhfp, d_size_t, myname)
{
    bwrite(nhfp.fd, d_size_t, C.type_size_t_size);
}

export function historical_sfi_size_t(nhfp, d_size_t, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_size_t, C.type_size_t_size);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_time_t(nhfp, d_time_t, myname)
{
    bwrite(nhfp.fd, d_time_t, C.type_time_t_size);
}

export function historical_sfi_time_t(nhfp, d_time_t, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_time_t, C.type_time_t_size);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_uchar(nhfp, d_uchar, myname)
{
    bwrite(nhfp.fd, d_uchar, C.type_uchar_size);
}

export function historical_sfi_uchar(nhfp, d_uchar, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_uchar, C.type_uchar_size);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_uint16(nhfp, d_uint16, myname)
{
    bwrite(nhfp.fd, d_uint16, C.type_uint16_size);
}

export function historical_sfi_uint16(nhfp, d_uint16, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_uint16, C.type_uint16_size);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_uint32(nhfp, d_uint32, myname)
{
    bwrite(nhfp.fd, d_uint32, C.type_uint32_size);
}

export function historical_sfi_uint32(nhfp, d_uint32, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_uint32, C.type_uint32_size);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_uint64(nhfp, d_uint64, myname)
{
    bwrite(nhfp.fd, d_uint64, C.type_uint64_size);
}

export function historical_sfi_uint64(nhfp, d_uint64, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_uint64, C.type_uint64_size);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_ulong(nhfp, d_ulong, myname)
{
    bwrite(nhfp.fd, d_ulong, C.type_ulong_size);
}

export function historical_sfi_ulong(nhfp, d_ulong, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_ulong, C.type_ulong_size);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_unsigned(nhfp, d_unsigned, myname)
{
    bwrite(nhfp.fd, d_unsigned, C.type_unsigned_size);
}

export function historical_sfi_unsigned(nhfp, d_unsigned, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_unsigned, C.type_unsigned_size);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_ushort(nhfp, d_ushort, myname)
{
    bwrite(nhfp.fd, d_ushort, C.type_ushort_size);
}

export function historical_sfi_ushort(nhfp, d_ushort, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_ushort, C.type_ushort_size);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_xint16(nhfp, d_xint16, myname)
{
    bwrite(nhfp.fd, d_xint16, C.type_xint16_size);
}

export function historical_sfi_xint16(nhfp, d_xint16, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_xint16, C.type_xint16_size);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_xint8(nhfp, d_xint8, myname)
{
    bwrite(nhfp.fd, d_xint8, C.type_xint8_size);
}

export function historical_sfi_xint8(nhfp, d_xint8, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_xint8, C.type_xint8_size);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_version_info(nhfp, d_version_info, myname)
{
    C.norm_ptrs_version_info(d_version_info);
    bwrite(nhfp.fd, d_version_info, C.type_version_info_size);
}

export function historical_sfi_version_info(nhfp, d_version_info, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_version_info, C.type_version_info_size);
    C.norm_ptrs_version_info(d_version_info);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_char(nhfp, d_char, myname, cnt)
{
    bwrite(nhfp.fd, d_char, C.uint(cnt));
}

export function historical_sfi_char(nhfp, d_char, myname, cnt)
{
    mread(nhfp.fd, d_char, C.uint(cnt));
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_genericptr_t(nhfp, d_genericptr_t, myname)
{
    bwrite(nhfp.fd, d_genericptr_t, C.type_genericptr_t_size);
}

export function historical_sfi_genericptr_t(nhfp, d_genericptr_t, myname)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_genericptr_t, C.type_genericptr_t_size);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export function historical_sfo_bitfield(nhfp, d_bitfield, myname, bflen)
{
    bwrite(nhfp.fd, d_bitfield, C.type_bitfield_size);
}

export function historical_sfi_bitfield(nhfp, d_bitfield, myname, bflen)
{
    if (nhfp.eof) {
        sfstruct_read_error();
    }
    mread(nhfp.fd, d_bitfield, C.type_bitfield_size);
    if (C.restoreinfo.mread_flags == -1)
        nhfp.eof = 1;
}

export const historical_sfo_procs = {
    ext: "",
    /* sf */
    fn: {
        sf_arti_info: historical_sfo_arti_info,
        sf_nhrect: historical_sfo_nhrect,
        sf_branch: historical_sfo_branch,
        sf_bubble: historical_sfo_bubble,
        sf_cemetery: historical_sfo_cemetery,
        sf_context_info: historical_sfo_context_info,
        sf_nhcoord: historical_sfo_nhcoord,
        sf_damage: historical_sfo_damage,
        sf_dest_area: historical_sfo_dest_area,
        sf_dgn_topology: historical_sfo_dgn_topology,
        sf_dungeon: historical_sfo_dungeon,
        sf_d_level: historical_sfo_d_level,
        sf_ebones: historical_sfo_ebones,
        sf_edog: historical_sfo_edog,
        sf_egd: historical_sfo_egd,
        sf_emin: historical_sfo_emin,
        sf_engr: historical_sfo_engr,
        sf_epri: historical_sfo_epri,
        sf_eshk: historical_sfo_eshk,
        sf_fe: historical_sfo_fe,
        sf_flag: historical_sfo_flag,
        sf_fruit: historical_sfo_fruit,
        sf_gamelog_line: historical_sfo_gamelog_line,
        sf_kinfo: historical_sfo_kinfo,
        sf_levelflags: historical_sfo_levelflags,
        sf_ls_t: historical_sfo_ls_t,
        sf_linfo: historical_sfo_linfo,
        sf_mapseen_feat: historical_sfo_mapseen_feat,
        sf_mapseen_flags: historical_sfo_mapseen_flags,
        sf_mapseen_rooms: historical_sfo_mapseen_rooms,
        sf_mkroom: historical_sfo_mkroom,
        sf_monst: historical_sfo_monst,
        sf_mvitals: historical_sfo_mvitals,
        sf_obj: historical_sfo_obj,
        sf_objclass: historical_sfo_objclass,
        sf_q_score: historical_sfo_q_score,
        sf_rm: historical_sfo_rm,
        sf_spell: historical_sfo_spell,
        sf_stairway: historical_sfo_stairway,
        sf_s_level: historical_sfo_s_level,
        sf_trap: historical_sfo_trap,
        sf_version_info: historical_sfo_version_info,
        sf_you: historical_sfo_you,
        sf_any: historical_sfo_any,
        sf_aligntyp: historical_sfo_aligntyp,
        sf_boolean: historical_sfo_boolean,
        sf_coordxy: historical_sfo_coordxy,
        sf_genericptr: historical_sfo_genericptr_t,
        sf_int: historical_sfo_int,
        sf_int16: historical_sfo_int16,
        sf_int32: historical_sfo_int32,
        sf_int64: historical_sfo_int64,
        sf_long: historical_sfo_long,
        sf_schar: historical_sfo_schar,
        sf_short: historical_sfo_short,
        sf_size_t: historical_sfo_size_t,
        sf_time_t: historical_sfo_time_t,
        sf_uchar: historical_sfo_uchar,
        sf_uint16: historical_sfo_uint16,
        sf_uint32: historical_sfo_uint32,
        sf_uint64: historical_sfo_uint64,
        sf_ulong: historical_sfo_ulong,
        sf_unsigned: historical_sfo_unsigned,
        sf_ushort: historical_sfo_ushort,
        sf_xint16: historical_sfo_xint16,
        sf_xint8: historical_sfo_xint8,
        sf_char: historical_sfo_char,
        sf_bitfield: historical_sfo_bitfield,
    },
};

export const historical_sfi_procs = {
    ext: "",
    /* sf */
    fn: {
        sf_arti_info: historical_sfi_arti_info,
        sf_nhrect: historical_sfi_nhrect,
        sf_branch: historical_sfi_branch,
        sf_bubble: historical_sfi_bubble,
        sf_cemetery: historical_sfi_cemetery,
        sf_context_info: historical_sfi_context_info,
        sf_nhcoord: historical_sfi_nhcoord,
        sf_damage: historical_sfi_damage,
        sf_dest_area: historical_sfi_dest_area,
        sf_dgn_topology: historical_sfi_dgn_topology,
        sf_dungeon: historical_sfi_dungeon,
        sf_d_level: historical_sfi_d_level,
        sf_ebones: historical_sfi_ebones,
        sf_edog: historical_sfi_edog,
        sf_egd: historical_sfi_egd,
        sf_emin: historical_sfi_emin,
        sf_engr: historical_sfi_engr,
        sf_epri: historical_sfi_epri,
        sf_eshk: historical_sfi_eshk,
        sf_fe: historical_sfi_fe,
        sf_flag: historical_sfi_flag,
        sf_fruit: historical_sfi_fruit,
        sf_gamelog_line: historical_sfi_gamelog_line,
        sf_kinfo: historical_sfi_kinfo,
        sf_levelflags: historical_sfi_levelflags,
        sf_ls_t: historical_sfi_ls_t,
        sf_linfo: historical_sfi_linfo,
        sf_mapseen_feat: historical_sfi_mapseen_feat,
        sf_mapseen_flags: historical_sfi_mapseen_flags,
        sf_mapseen_rooms: historical_sfi_mapseen_rooms,
        sf_mkroom: historical_sfi_mkroom,
        sf_monst: historical_sfi_monst,
        sf_mvitals: historical_sfi_mvitals,
        sf_obj: historical_sfi_obj,
        sf_objclass: historical_sfi_objclass,
        sf_q_score: historical_sfi_q_score,
        sf_rm: historical_sfi_rm,
        sf_spell: historical_sfi_spell,
        sf_stairway: historical_sfi_stairway,
        sf_s_level: historical_sfi_s_level,
        sf_trap: historical_sfi_trap,
        sf_version_info: historical_sfi_version_info,
        sf_you: historical_sfi_you,
        sf_any: historical_sfi_any,
        sf_aligntyp: historical_sfi_aligntyp,
        sf_boolean: historical_sfi_boolean,
        sf_coordxy: historical_sfi_coordxy,
        sf_genericptr: historical_sfi_genericptr_t,
        sf_int: historical_sfi_int,
        sf_int16: historical_sfi_int16,
        sf_int32: historical_sfi_int32,
        sf_int64: historical_sfi_int64,
        sf_long: historical_sfi_long,
        sf_schar: historical_sfi_schar,
        sf_short: historical_sfi_short,
        sf_size_t: historical_sfi_size_t,
        sf_time_t: historical_sfi_time_t,
        sf_uchar: historical_sfi_uchar,
        sf_uint16: historical_sfi_uint16,
        sf_uint32: historical_sfi_uint32,
        sf_uint64: historical_sfi_uint64,
        sf_ulong: historical_sfi_ulong,
        sf_unsigned: historical_sfi_unsigned,
        sf_ushort: historical_sfi_ushort,
        sf_xint16: historical_sfi_xint16,
        sf_xint8: historical_sfi_xint8,
        sf_char: historical_sfi_char,
        sf_bitfield: historical_sfi_bitfield,
    },
};

/*
 * The historical bwrite() and mread() functions follow
 */
/*
 * historical structlevel savefile writing and reading routines follow.
 * These were moved here from save.c and restore.c between 3.6.3 and 5.0.0,.
 */
export const restoreinfo_initial = { name: "externalcomp", mread_flags: 0 };
export const MAXFD = 5;
export const NOFLG = 0, NOSLOT = 1;
export const bw_sticky_initial = [-1, -1, -1, -1, -1];
export const bw_buffered_initial = [0, 0, 0, 0, 0];
export const bw_FILE_initial = [0, 0, 0, 0, 0];

/*
 * Presumably, the fdopen() to allow use of stdio fwrite()
 * over write() was done for performance or functionality
 * reasons to help some particular platform long ago.
 *
 * There have been some issues being encountered with the
 * implementation due to having an individual set of
 * tracking variables, even though there were nested
 * sets of open fd (like INSURANCE).
 *
 * This uses an individual tracking entry for each fd
 * being used.
 *
 * Some notes:
 *
 * Once buffered IO (stdio) has been enabled on the file
 * associated with a descriptor via fdopen():
 *
 *    1. If you use bufoff and bufon to try to toggle the
 *       use of write vs fwrite; the code just tracks which
 *       routine is to be called through the tracking
 *       variables and acts accordingly.
 *             bw_sticky[]    -  used to find the index number for
 *                               the fd that is stored in it, or -1
 *                               if it is a free slot.
 *             bw_buffered[]  -  indicator that buffered IO routines
 *                               are available for use.
 *             bw_FILE[]      -  the non-zero FILE * for use in calling
 *                               fwrite() when bw_buffered[] is also
 *                               non-zero.
 *
 *    2. It is illegal to call close(fd) after fdopen(), you
 *       must always use fclose() on the FILE * from
 *       that point on, so care must be taken to never call
 *       close(fd) on the underlying fd or bad things will
 *       happen.
 */

export function getidx(fd, flg)
{
    let i, retval = -1;

    for (i = 0; i < C.MAXFD; ++i)
        if (C.bw_sticky[i] == fd)
            return i;
    if (flg == C.NOSLOT)
        return retval;
    for (i = 0; i < C.MAXFD; ++i)
        if (C.bw_sticky[i] < 0) {
            C.bw_sticky[i] = fd;
            retval = i;
            break;
        }
    return retval;
}

/* Let caller know that bclose() should handle it (TRUE) */
export function close_check(fd)
{
    let idx = getidx(fd, C.NOSLOT);
    let retval = 0;

    if (idx >= 0)
        retval = 1;
    return retval;
}

export function bufon(fd)
{
    let idx = getidx(fd, C.NOFLG);

    if (idx >= 0) {
        C.bw_sticky[idx] = fd;
        if (C.bw_buffered[idx])
            C.panic("buffering already enabled");
        if (!C.bw_FILE[idx]) {
            if ((C.bw_FILE[idx] = C.fdopen(fd, "w")) == 0)
                C.panic("buffering of file %d failed", fd);
        }
        C.bw_buffered[idx] = (C.bw_FILE[idx] != 0);
    }
}

export function bufoff(fd)
{
    let idx = getidx(fd, C.NOFLG);

    if (idx >= 0) {
        bflush(fd);
        C.bw_buffered[idx] = 0;     /* just a flag that says "use write(fd)" */
    }
}

export function bclose(fd)
{
    let idx = getidx(fd, C.NOSLOT);

    bufoff(fd);     /* sets bw_buffered[idx] = 0 */
    if (idx >= 0) {
        if (C.bw_FILE[idx]) {
            C.fclose(C.bw_FILE[idx]);
            C.bw_FILE[idx] = 0;
        } else
            C.close(fd);
        /* return the idx to the pool */
        C.bw_sticky[idx] = -1;
    }
    return;
}

export function bflush(fd)
{
    let idx = getidx(fd, C.NOFLG);

    if (idx >= 0) {
        if (C.bw_FILE[idx]) {
           if (C.fflush(C.bw_FILE[idx]) == C.EOF)
               C.panic("flush of savefile failed!");
        }
    }
    return;
}

export function bwrite(fd, loc, num)
{
    let failed;
    let idx = getidx(fd, C.NOFLG);


    if (idx >= 0) {
        if (num == 0) {
            /* nothing to do; we need a special case to exit early
               because glibc fwrite doesn't give reliable
               success/failure indication when writing 0 bytes */
            return;
        }

        if (C.bw_buffered[idx] && C.bw_FILE[idx]) {
            failed = (C.fwrite(loc, C.int(num), 1, C.bw_FILE[idx]) != 1);
        } else
        /* UNIX */
        {
            /* lint wants 3rd arg of write to be an int; lint -p an unsigned */
            /* e.g. SYSV, __TURBOC__ */
            failed = (C.write(fd, loc, num) != num);
        }
        if (failed) {
            if (C.program_state.done_hup)
                C.nh_terminate(C.EXIT_FAILURE);
            else
                C.panic("cannot write %u bytes to file #%d", num, fd);
        }
    } else
        C.impossible("fd not in list (%d)?", fd);
}

/*  ===================================================== */

export function mread(fd, buf, len)
{


    /* e.g. SYSV, __TURBOC__ */
    let rlen;
        /* Not perfect, but we don't have ssize_t available. */
    rlen = C.uint(C.read(fd, buf, C.uint(len)));
    if (C.uint(rlen) != C.uint(len)) {
        if ((C.restoreinfo.mread_flags == 1) /* means "return anyway" */
            || (C.program_state.reading_bonesfile == 1)) {
            C.restoreinfo.mread_flags = -1;
            return;
        } else {
            C.pline("Read %d instead of %u bytes.", C.int(rlen), len);
            C.display_nhwindow(); /* flush before error() */
            if (C.program_state.restoring) {
                C.nhclose(fd);
                C.delete_savefile();
                C.error("Error restoring old game.");
            }
            C.panic("Error reading level file.");
        }
    }
}

export function sfstruct_read_error()
{
    /* problem */;
}


/* SFLOGGING */

/* end of sfstruct.c */
