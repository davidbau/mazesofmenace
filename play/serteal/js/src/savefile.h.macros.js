/* NetHack 5.0	savefile.h	$NHDT-Date: 1738638877 2025/02/03 19:14:37 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.1476 $ */
/* Copyright (c) Michael Allison, 2025.                           */
/* NetHack may be freely redistributed.  See license for details. */




/* #define SAVEFILE_DEBUGGING */


/* sfbase.c output functions */














//extern void sfo_str(NHFILE *, char *, const char *, int);








































































/* sfbase.c input functions */

























































































export function Sfo_any(a, b, c) { return sfo_any(a, b, c); }

export function Sfo_coordxy(a, b, c) { return sfo_int16(a, b, c); }
export function Sfo_char(a, b, c, d) { return sfo_char(a, b, c, d); }

export function Sfo_int32(a, b, c) { return sfo_int32(a, b, c); }

export function Sfo_uchar(a, b, c) { return sfo_uchar(a, b, c); }






export function Sfo_arti_info(a, b, c) { return sfo_arti_info(a, b, c); }
export function Sfo_dgn_topology(a, b, c) { return sfo_dgn_topology(a, b, c); }
export function Sfo_dungeon(a, b, c) { return sfo_dungeon(a, b, c); }
export function Sfo_branch(a, b, c) { return sfo_branch(a, b, c); }
export function Sfo_linfo(a, b, c) { return sfo_linfo(a, b, c); }
export function Sfo_nhcoord(a, b, c) { return sfo_nhcoord(a, b, c); }
export function Sfo_d_level(a, b, c) { return sfo_d_level(a, b, c); }
export function Sfo_mapseen_feat(a, b, c) { return sfo_mapseen_feat(a, b, c); }
export function Sfo_mapseen_flags(a, b, c) { return sfo_mapseen_flags(a, b, c); }
export function Sfo_mapseen_rooms(a, b, c) { return sfo_mapseen_rooms(a, b, c); }
export function Sfo_kinfo(a, b, c) { return sfo_kinfo(a, b, c); }
export function Sfo_engr(a, b, c) { return sfo_engr(a, b, c); }
export function Sfo_ls_t(a, b, c) { return sfo_ls_t(a, b, c); }
export function Sfo_bubble(a, b, c) { return sfo_bubble(a, b, c); }
export function Sfo_mkroom(a, b, c) { return sfo_mkroom(a, b, c); }
export function Sfo_objclass(a, b, c) { return sfo_objclass(a, b, c); }
export function Sfo_nhrect(a, b, c) { return sfo_nhrect(a, b, c); }
export function Sfo_fe(a, b, c) { return sfo_fe(a, b, c); }
export function Sfo_version_info(a, b, c) { return sfo_version_info(a, b, c); }
export function Sfo_context_info(a, b, c) { return sfo_context_info(a, b, c); }
export function Sfo_flag(a, b, c) { return sfo_flag(a, b, c); }
export function Sfo_you(a, b, c) { return sfo_you(a, b, c); }
export function Sfo_mvitals(a, b, c) { return sfo_mvitals(a, b, c); }
export function Sfo_q_score(a, b, c) { return sfo_q_score(a, b, c); }
export function Sfo_spell(a, b, c) { return sfo_spell(a, b, c); }
export function Sfo_dest_area(a, b, c) { return sfo_dest_area(a, b, c); }
export function Sfo_levelflags(a, b, c) { return sfo_levelflags(a, b, c); }
export function Sfo_rm(a, b, c) { return sfo_rm(a, b, c); }
export function Sfo_cemetery(a, b, c) { return sfo_cemetery(a, b, c); }
export function Sfo_damage(a, b, c) { return sfo_damage(a, b, c); }
export function Sfo_stairway(a, b, c) { return sfo_stairway(a, b, c); }
export function Sfo_obj(a, b, c) { return sfo_obj(a, b, c); }
export function Sfo_monst(a, b, c) { return sfo_monst(a, b, c); }
export function Sfo_ebones(a, b, c) { return sfo_ebones(a, b, c); }
export function Sfo_edog(a, b, c) { return sfo_edog(a, b, c); }
export function Sfo_egd(a, b, c) { return sfo_egd(a, b, c); }
export function Sfo_emin(a, b, c) { return sfo_emin(a, b, c); }

export function Sfo_epri(a, b, c) { return sfo_epri(a, b, c); }
export function Sfo_eshk(a, b, c) { return sfo_eshk(a, b, c); }
export function Sfo_trap(a, b, c) { return sfo_trap(a, b, c); }
export function Sfo_gamelog_line(a, b, c) { return sfo_gamelog_line(a, b, c); }
export function Sfo_fruit(a, b, c) { return sfo_fruit(a, b, c); }
export function Sfo_s_level(a, b, c) { return sfo_s_level(a, b, c); }
export function Sfo_short(a, b, c) { return sfo_short(a, b, c); }

export function Sfo_int(a, b, c) { return sfo_int(a, b, c); }
export function Sfo_unsigned(a, b, c) { return sfo_unsigned(a, b, c); }

export function Sfo_xint16(a, b, c) { return sfo_xint16(a, b, c); }
/* sfbase.c input functions */


export function Sfi_any(a, b, c) { return sfi_any(a, b, c); }

export function Sfi_coordxy(a, b, c) { return sfi_int16(a, b, c); }

export function Sfi_int32(a, b, c) { return sfi_int32(a, b, c); }

export function Sfi_uchar(a, b, c) { return sfi_uchar(a, b, c); }





export function Sfi_arti_info(a, b, c) { return sfi_arti_info(a, b, c); }
export function Sfi_dungeon(a, b, c) { return sfi_dungeon(a, b, c); }
export function Sfi_dgn_topology(a, b, c) { return sfi_dgn_topology(a, b, c); }
export function Sfi_branch(a, b, c) { return sfi_branch(a, b, c); }
export function Sfi_linfo(a, b, c) { return sfi_linfo(a, b, c); }
export function Sfi_nhcoord(a, b, c) { return sfi_nhcoord(a, b, c); }
export function Sfi_d_level(a, b, c) { return sfi_d_level(a, b, c); }
export function Sfi_mapseen_feat(a, b, c) { return sfi_mapseen_feat(a, b, c); }
export function Sfi_mapseen_flags(a, b, c) { return sfi_mapseen_flags(a, b, c); }
export function Sfi_mapseen_rooms(a, b, c) { return sfi_mapseen_rooms(a, b, c); }
export function Sfi_kinfo(a, b, c) { return sfi_kinfo(a, b, c); }
export function Sfi_engr(a, b, c) { return sfi_engr(a, b, c); }
export function Sfi_ls_t(a, b, c) { return sfi_ls_t(a, b, c); }
export function Sfi_bubble(a, b, c) { return sfi_bubble(a, b, c); }
export function Sfi_mkroom(a, b, c) { return sfi_mkroom(a, b, c); }
export function Sfi_objclass(a, b, c) { return sfi_objclass(a, b, c); }
export function Sfi_nhrect(a, b, c) { return sfi_nhrect(a, b, c); }
export function Sfi_fe(a, b, c) { return sfi_fe(a, b, c); }
export function Sfi_version_info(a, b, c) { return sfi_version_info(a, b, c); }
export function Sfi_context_info(a, b, c) { return sfi_context_info(a, b, c); }
export function Sfi_flag(a, b, c) { return sfi_flag(a, b, c); }
export function Sfi_you(a, b, c) { return sfi_you(a, b, c); }
export function Sfi_mvitals(a, b, c) { return sfi_mvitals(a, b, c); }
export function Sfi_q_score(a, b, c) { return sfi_q_score(a, b, c); }
export function Sfi_spell(a, b, c) { return sfi_spell(a, b, c); }
export function Sfi_dest_area(a, b, c) { return sfi_dest_area(a, b, c); }
export function Sfi_levelflags(a, b, c) { return sfi_levelflags(a, b, c); }
export function Sfi_rm(a, b, c) { return sfi_rm(a, b, c); }
export function Sfi_cemetery(a, b, c) { return sfi_cemetery(a, b, c); }
export function Sfi_damage(a, b, c) { return sfi_damage(a, b, c); }
export function Sfi_stairway(a, b, c) { return sfi_stairway(a, b, c); }
export function Sfi_obj(a, b, c) { return sfi_obj(a, b, c); }
export function Sfi_monst(a, b, c) { return sfi_monst(a, b, c); }
export function Sfi_ebones(a, b, c) { return sfi_ebones(a, b, c); }
export function Sfi_edog(a, b, c) { return sfi_edog(a, b, c); }
export function Sfi_egd(a, b, c) { return sfi_egd(a, b, c); }
export function Sfi_emin(a, b, c) { return sfi_emin(a, b, c); }

export function Sfi_epri(a, b, c) { return sfi_epri(a, b, c); }
export function Sfi_eshk(a, b, c) { return sfi_eshk(a, b, c); }
export function Sfi_trap(a, b, c) { return sfi_trap(a, b, c); }
export function Sfi_fruit(a, b, c) { return sfi_fruit(a, b, c); }
export function Sfi_gamelog_line(a, b, c) { return sfi_gamelog_line(a, b, c); }
export function Sfi_s_level(a, b, c) { return sfi_s_level(a, b, c); }
export function Sfi_short(a, b, c) { return sfi_short(a, b, c); }































































/*    struct container * : sfo_container, */
/*    struct mapseen *   : sfo_mapseen,   */
/*    struct mextra *    : sfo_mextra,    */
/*    struct oextra *    : sfo_oextra,    */
/*    struct permonst *  : sfo_permonst,  */

























































/*    char *                : sfo_char,   */
/*    char *                : sfi_char,   */
/*    struct container * : sfi_container, */
/*    struct mapseen *   : sfi_mapseen,   */
/*    struct mextra *    : sfi_mextra,    */
/*    struct oextra *    : sfi_oextra,    */
/*    struct permonst *  : sfi_permonst,  */




































































/* sfbase.c input functions */


































































/* not in _Generic */



export function Sfo_boolean(a, b, c) { return sfo_boolean(a, b, c); }
export function Sfo_schar(a, b, c) { return sfo_schar(a, b, c); }



export function Sfi_char(a, b, c, d) { return sfi_char(a, b, c, d); }
export function Sfi_boolean(a, b, c) { return sfi_boolean(a, b, c); }
export function Sfi_schar(a, b, c) { return sfi_schar(a, b, c); }
import { sfi_any } from "./sfbase.js";
import { sfi_arti_info } from "./sfbase.js";
import { sfi_boolean } from "./sfbase.js";
import { sfi_branch } from "./sfbase.js";
import { sfi_bubble } from "./sfbase.js";
import { sfi_cemetery } from "./sfbase.js";
import { sfi_char } from "./sfbase.js";
import { sfi_context_info } from "./sfbase.js";
import { sfi_d_level } from "./sfbase.js";
import { sfi_damage } from "./sfbase.js";
import { sfi_dest_area } from "./sfbase.js";
import { sfi_dgn_topology } from "./sfbase.js";
import { sfi_dungeon } from "./sfbase.js";
import { sfi_ebones } from "./sfbase.js";
import { sfi_edog } from "./sfbase.js";
import { sfi_egd } from "./sfbase.js";
import { sfi_emin } from "./sfbase.js";
import { sfi_engr } from "./sfbase.js";
import { sfi_epri } from "./sfbase.js";
import { sfi_eshk } from "./sfbase.js";
import { sfi_fe } from "./sfbase.js";
import { sfi_flag } from "./sfbase.js";
import { sfi_fruit } from "./sfbase.js";
import { sfi_gamelog_line } from "./sfbase.js";
import { sfi_int16 } from "./sfbase.js";
import { sfi_int32 } from "./sfbase.js";
import { sfi_kinfo } from "./sfbase.js";
import { sfi_levelflags } from "./sfbase.js";
import { sfi_linfo } from "./sfbase.js";
import { sfi_ls_t } from "./sfbase.js";
import { sfi_mapseen_feat } from "./sfbase.js";
import { sfi_mapseen_flags } from "./sfbase.js";
import { sfi_mapseen_rooms } from "./sfbase.js";
import { sfi_mkroom } from "./sfbase.js";
import { sfi_monst } from "./sfbase.js";
import { sfi_mvitals } from "./sfbase.js";
import { sfi_nhcoord } from "./sfbase.js";
import { sfi_nhrect } from "./sfbase.js";
import { sfi_obj } from "./sfbase.js";
import { sfi_objclass } from "./sfbase.js";
import { sfi_q_score } from "./sfbase.js";
import { sfi_rm } from "./sfbase.js";
import { sfi_s_level } from "./sfbase.js";
import { sfi_schar } from "./sfbase.js";
import { sfi_short } from "./sfbase.js";
import { sfi_spell } from "./sfbase.js";
import { sfi_stairway } from "./sfbase.js";
import { sfi_trap } from "./sfbase.js";
import { sfi_uchar } from "./sfbase.js";
import { sfi_version_info } from "./sfbase.js";
import { sfi_you } from "./sfbase.js";
import { sfo_any } from "./sfbase.js";
import { sfo_arti_info } from "./sfbase.js";
import { sfo_boolean } from "./sfbase.js";
import { sfo_branch } from "./sfbase.js";
import { sfo_bubble } from "./sfbase.js";
import { sfo_cemetery } from "./sfbase.js";
import { sfo_char } from "./sfbase.js";
import { sfo_context_info } from "./sfbase.js";
import { sfo_d_level } from "./sfbase.js";
import { sfo_damage } from "./sfbase.js";
import { sfo_dest_area } from "./sfbase.js";
import { sfo_dgn_topology } from "./sfbase.js";
import { sfo_dungeon } from "./sfbase.js";
import { sfo_ebones } from "./sfbase.js";
import { sfo_edog } from "./sfbase.js";
import { sfo_egd } from "./sfbase.js";
import { sfo_emin } from "./sfbase.js";
import { sfo_engr } from "./sfbase.js";
import { sfo_epri } from "./sfbase.js";
import { sfo_eshk } from "./sfbase.js";
import { sfo_fe } from "./sfbase.js";
import { sfo_flag } from "./sfbase.js";
import { sfo_fruit } from "./sfbase.js";
import { sfo_gamelog_line } from "./sfbase.js";
import { sfo_int } from "./sfbase.js";
import { sfo_int16 } from "./sfbase.js";
import { sfo_int32 } from "./sfbase.js";
import { sfo_kinfo } from "./sfbase.js";
import { sfo_levelflags } from "./sfbase.js";
import { sfo_linfo } from "./sfbase.js";
import { sfo_ls_t } from "./sfbase.js";
import { sfo_mapseen_feat } from "./sfbase.js";
import { sfo_mapseen_flags } from "./sfbase.js";
import { sfo_mapseen_rooms } from "./sfbase.js";
import { sfo_mkroom } from "./sfbase.js";
import { sfo_monst } from "./sfbase.js";
import { sfo_mvitals } from "./sfbase.js";
import { sfo_nhcoord } from "./sfbase.js";
import { sfo_nhrect } from "./sfbase.js";
import { sfo_obj } from "./sfbase.js";
import { sfo_objclass } from "./sfbase.js";
import { sfo_q_score } from "./sfbase.js";
import { sfo_rm } from "./sfbase.js";
import { sfo_s_level } from "./sfbase.js";
import { sfo_schar } from "./sfbase.js";
import { sfo_short } from "./sfbase.js";
import { sfo_spell } from "./sfbase.js";
import { sfo_stairway } from "./sfbase.js";
import { sfo_trap } from "./sfbase.js";
import { sfo_uchar } from "./sfbase.js";
import { sfo_unsigned } from "./sfbase.js";
import { sfo_version_info } from "./sfbase.js";
import { sfo_xint16 } from "./sfbase.js";
import { sfo_you } from "./sfbase.js";
