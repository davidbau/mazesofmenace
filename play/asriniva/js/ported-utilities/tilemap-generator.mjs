import { C } from './tilemap-scope.mjs';
import { tilename, acceptable_tilename, precheck, add_tileref, dump_tilerefs, free_tilerefs } from './tilemap-common.mjs';
export { tilename, acceptable_tilename, precheck, add_tileref, dump_tilerefs, free_tilerefs };

/* TILETEXT || OBTAIN_TILEMAP */
/* Number of tiles for invisible monsters */

/*
 * set up array to map glyph numbers to tile numbers
 *
 * assumes tiles are numbered sequentially through monsters/objects/other,
 * with entries for all supported compilation options. monsters have two
 * tiles for each (male + female).
 *
 * "other" contains cmap and zaps (the swallow sets are a repeated portion
 * of cmap), as well as the "flash" glyphs for the new warning system
 * introduced in 3.3.1.
 */
export function init_tilemap()
{
    let i, j, k, cmap, condnum, tilenum, offset;
    let corpsetile, swallowbase;
    let file_entry = 0;

    C.tilemap_file = C.fopen("tilemappings.lst", "w");
    C.Fprintf(C.tilemap_file, "NUMMONS = %d\n", C.NUMMONS, C.genFprintfSites[0]);
    C.Fprintf(C.tilemap_file, "NUM_OBJECTS = %d\n", C.NUM_OBJECTS, C.genFprintfSites[1]);
    C.Fprintf(C.tilemap_file, "MAXEXPCHARS = %d\n", C.MAXEXPCHARS, C.genFprintfSites[2]);
    C.Fprintf(C.tilemap_file, "MAXPCHARS = %d\n", C.MAXPCHARS, C.genFprintfSites[3]);
    C.Fprintf(C.tilemap_file, "MAX_GLYPH = %d\n", C.MAX_GLYPH, C.genFprintfSites[4]);
    C.Fprintf(C.tilemap_file, "GLYPH_MON_OFF = %d\n", C.GLYPH_MON_OFF, C.genFprintfSites[5]);
    C.Fprintf(C.tilemap_file, "GLYPH_MON_MALE_OFF = %d\n", C.GLYPH_MON_MALE_OFF, C.genFprintfSites[6]);
    C.Fprintf(C.tilemap_file, "GLYPH_MON_FEM_OFF = %d\n", C.GLYPH_MON_FEM_OFF, C.genFprintfSites[7]);
    C.Fprintf(C.tilemap_file, "GLYPH_PET_OFF = %d\n", C.GLYPH_PET_OFF, C.genFprintfSites[8]);
    C.Fprintf(C.tilemap_file, "GLYPH_PET_MALE_OFF = %d\n", C.GLYPH_PET_MALE_OFF, C.genFprintfSites[9]);
    C.Fprintf(C.tilemap_file, "GLYPH_PET_FEM_OFF = %d\n", C.GLYPH_PET_FEM_OFF, C.genFprintfSites[10]);
    C.Fprintf(C.tilemap_file, "GLYPH_INVIS_OFF = %d\n", C.GLYPH_INVIS_OFF, C.genFprintfSites[11]);
    C.Fprintf(C.tilemap_file, "GLYPH_DETECT_OFF = %d\n", C.GLYPH_DETECT_OFF, C.genFprintfSites[12]);
    C.Fprintf(C.tilemap_file, "GLYPH_DETECT_MALE_OFF = %d\n",
            C.GLYPH_DETECT_MALE_OFF, C.genFprintfSites[13]);
    C.Fprintf(C.tilemap_file, "GLYPH_DETECT_FEM_OFF = %d\n",
            C.GLYPH_DETECT_FEM_OFF, C.genFprintfSites[14]);
    C.Fprintf(C.tilemap_file, "GLYPH_BODY_OFF = %d\n", C.GLYPH_BODY_OFF, C.genFprintfSites[15]);
    C.Fprintf(C.tilemap_file, "GLYPH_RIDDEN_OFF = %d\n", C.GLYPH_RIDDEN_OFF, C.genFprintfSites[16]);
    C.Fprintf(C.tilemap_file, "GLYPH_RIDDEN_MALE_OFF = %d\n",
            C.GLYPH_RIDDEN_MALE_OFF, C.genFprintfSites[17]);
    C.Fprintf(C.tilemap_file, "GLYPH_RIDDEN_FEM_OFF = %d\n",
            C.GLYPH_RIDDEN_FEM_OFF, C.genFprintfSites[18]);
    C.Fprintf(C.tilemap_file, "GLYPH_OBJ_OFF = %d\n", C.GLYPH_OBJ_OFF, C.genFprintfSites[19]);
    C.Fprintf(C.tilemap_file, "GLYPH_CMAP_OFF = %d\n", C.GLYPH_CMAP_OFF, C.genFprintfSites[20]);
    C.Fprintf(C.tilemap_file, "GLYPH_CMAP_STONE_OFF = %d\n", C.GLYPH_CMAP_STONE_OFF, C.genFprintfSites[21]);
    C.Fprintf(C.tilemap_file, "GLYPH_CMAP_MAIN_OFF = %d\n", C.GLYPH_CMAP_MAIN_OFF, C.genFprintfSites[22]);
    C.Fprintf(C.tilemap_file, "GLYPH_CMAP_MINES_OFF = %d\n",
            C.GLYPH_CMAP_MINES_OFF, C.genFprintfSites[23]);
    C.Fprintf(C.tilemap_file, "GLYPH_CMAP_GEH_OFF = %d\n", C.GLYPH_CMAP_GEH_OFF, C.genFprintfSites[24]);
    C.Fprintf(C.tilemap_file, "GLYPH_CMAP_KNOX_OFF = %d\n", C.GLYPH_CMAP_KNOX_OFF, C.genFprintfSites[25]);
    C.Fprintf(C.tilemap_file, "GLYPH_CMAP_SOKO_OFF = %d\n", C.GLYPH_CMAP_SOKO_OFF, C.genFprintfSites[26]);
    C.Fprintf(C.tilemap_file, "GLYPH_CMAP_A_OFF = %d\n", C.GLYPH_CMAP_A_OFF, C.genFprintfSites[27]);
    C.Fprintf(C.tilemap_file, "GLYPH_ALTAR_OFF = %d\n", C.GLYPH_ALTAR_OFF, C.genFprintfSites[28]);
    C.Fprintf(C.tilemap_file, "GLYPH_CMAP_B_OFF = %d\n", C.GLYPH_CMAP_B_OFF, C.genFprintfSites[29]);
    C.Fprintf(C.tilemap_file, "GLYPH_ZAP_OFF = %d\n", C.GLYPH_ZAP_OFF, C.genFprintfSites[30]);
    C.Fprintf(C.tilemap_file, "GLYPH_CMAP_C_OFF = %d\n", C.GLYPH_CMAP_C_OFF, C.genFprintfSites[31]);
    C.Fprintf(C.tilemap_file, "GLYPH_SWALLOW_OFF = %d\n", C.GLYPH_SWALLOW_OFF, C.genFprintfSites[32]);
    C.Fprintf(C.tilemap_file, "GLYPH_EXPLODE_OFF = %d\n", C.GLYPH_EXPLODE_OFF, C.genFprintfSites[33]);
    C.Fprintf(C.tilemap_file, "GLYPH_EXPLODE_DARK_OFF = %d\n",
            C.GLYPH_EXPLODE_DARK_OFF, C.genFprintfSites[34]);
    C.Fprintf(C.tilemap_file, "GLYPH_EXPLODE_NOXIOUS_OFF = %d\n",
            C.GLYPH_EXPLODE_NOXIOUS_OFF, C.genFprintfSites[35]);
    C.Fprintf(C.tilemap_file, "GLYPH_EXPLODE_MUDDY_OFF = %d\n",
            C.GLYPH_EXPLODE_MUDDY_OFF, C.genFprintfSites[36]);
    C.Fprintf(C.tilemap_file, "GLYPH_EXPLODE_WET_OFF = %d\n",
            C.GLYPH_EXPLODE_WET_OFF, C.genFprintfSites[37]);
    C.Fprintf(C.tilemap_file, "GLYPH_EXPLODE_MAGICAL_OFF = %d\n",
            C.GLYPH_EXPLODE_MAGICAL_OFF, C.genFprintfSites[38]);
    C.Fprintf(C.tilemap_file, "GLYPH_EXPLODE_FIERY_OFF = %d\n",
            C.GLYPH_EXPLODE_FIERY_OFF, C.genFprintfSites[39]);
    C.Fprintf(C.tilemap_file, "GLYPH_EXPLODE_FROSTY_OFF = %d\n",
            C.GLYPH_EXPLODE_FROSTY_OFF, C.genFprintfSites[40]);
    C.Fprintf(C.tilemap_file, "GLYPH_WARNING_OFF = %d\n", C.GLYPH_WARNING_OFF, C.genFprintfSites[41]);
    C.Fprintf(C.tilemap_file, "GLYPH_STATUE_OFF = %d\n", C.GLYPH_STATUE_OFF, C.genFprintfSites[42]);
    C.Fprintf(C.tilemap_file, "GLYPH_STATUE_MALE_OFF = %d\n",
            C.GLYPH_STATUE_MALE_OFF, C.genFprintfSites[43]);
    C.Fprintf(C.tilemap_file, "GLYPH_STATUE_FEM_OFF = %d\n",
            C.GLYPH_STATUE_FEM_OFF, C.genFprintfSites[44]);
    C.Fprintf(C.tilemap_file, "GLYPH_OBJ_PILETOP_OFF = %d\n",
            C.GLYPH_OBJ_PILETOP_OFF, C.genFprintfSites[45]);
    C.Fprintf(C.tilemap_file, "GLYPH_BODY_PILETOP_OFF = %d\n",
            C.GLYPH_BODY_PILETOP_OFF, C.genFprintfSites[46]);
    C.Fprintf(C.tilemap_file, "GLYPH_STATUE_MALE_PILETOP_OFF = %d\n",
            C.GLYPH_STATUE_MALE_PILETOP_OFF, C.genFprintfSites[47]);
    C.Fprintf(C.tilemap_file, "GLYPH_STATUE_FEM_PILETOP_OFF = %d\n",
            C.GLYPH_STATUE_FEM_PILETOP_OFF, C.genFprintfSites[48]);
    C.Fprintf(C.tilemap_file, "GLYPH_UNEXPLORED_OFF = %d\n",
            C.GLYPH_UNEXPLORED_OFF, C.genFprintfSites[49]);
    C.Fprintf(C.tilemap_file, "GLYPH_NOTHING_OFF = %d\n", C.GLYPH_NOTHING_OFF, C.genFprintfSites[50]);




    for (i = 0; i < C.MAX_GLYPH; i++) {
        C.tilemap[i].tilenum = -1;
    }

    corpsetile = C.NUMMONS                                   /* MON_MALE */
               + C.NUMMONS                                   /* MON_FEM */
               + C.NUM_INVIS_TILES                           /* INVIS */
               + C.CORPSE;                                   /* within OBJ */

    swallowbase = C.NUMMONS                                  /* MON_MALE */
                + C.NUMMONS                                  /* MON_FEM */
                + C.NUM_INVIS_TILES                          /* INVIS */
                + C.NUM_OBJECTS                              /* Objects */
                + 1                                        /* Stone */
                + ((C.S_trwall - C.S_vwall) + 1)               /* main walls */
                + ((C.S_brdnladder - C.S_ndoor) + 1)           /* cmap A */
                + (4 + 1)                                  /* 5 altar tiles */
                + (C.S_arrow_trap + C.MAXTCHARS - C.S_grave)     /* cmap B */
                + (C.NUM_ZAP << 2)                           /* zaps */
                + ((C.S_goodpos - C.S_digbeam) + 1);           /* cmap C */

    /* add number compiled out */
    for (i = 0; C.conditionals[i].sequence != C.TERMINATOR; i++) {
        switch (C.conditionals[i].sequence) {
        case C.MON_GLYPH:
            corpsetile += 2;
            swallowbase += 2;
            break;
        case C.OBJ_GLYPH:
            if (C.conditionals[i].predecessor < C.CORPSE)
                corpsetile++;
            swallowbase++;
            break;
        case C.OTH_GLYPH:
            if (C.conditionals[i].predecessor < C.S_sw_tl)
                swallowbase++;
            break;
        }
    }

    tilenum = 0;
    for (i = 0; i < C.NUMMONS; i++) {
        const buf = C.scratchLocal('init_buf', 256);




        C.tilemap[C.GLYPH_MON_MALE_OFF + i].tilenum = tilenum;
        C.tilemap[C.GLYPH_PET_MALE_OFF + i].tilenum = tilenum;
        C.tilemap[C.GLYPH_DETECT_MALE_OFF + i].tilenum = tilenum;
        C.tilemap[C.GLYPH_RIDDEN_MALE_OFF + i].tilenum = tilenum;
        C.tilemap[C.GLYPH_BODY_OFF + i].tilenum = corpsetile;
        C.tilemap[C.GLYPH_BODY_PILETOP_OFF + i].tilenum = corpsetile;
        C.Sprintf(buf, "%s (mnum=%d)", tilename(C.MON_GLYPH, file_entry, 0), i, C.genSprintfSites[0]);
        C.Snprintf(C.tilemap[C.GLYPH_MON_MALE_OFF + i].name,
                 C.mapNameSize,"male %s", buf, C.genSnprintfSites[0]);
        C.Snprintf(C.tilemap[C.GLYPH_PET_MALE_OFF + i].name,
                 C.mapNameSize, "%s male %s", "pet", buf, C.genSnprintfSites[1]);
        C.Snprintf(C.tilemap[C.GLYPH_DETECT_MALE_OFF + i].name,
                 C.mapNameSize, "%s male %s", "detected", buf, C.genSnprintfSites[2]);
        C.Snprintf(C.tilemap[C.GLYPH_RIDDEN_MALE_OFF + i].name,
                 C.mapNameSize, "%s male %s", "ridden", buf, C.genSnprintfSites[3]);
        C.Snprintf(C.tilemap[C.GLYPH_BODY_OFF + i].name,
                 C.mapNameSize, "%s %s", "body of", buf, C.genSnprintfSites[4]);
        C.Snprintf(C.tilemap[C.GLYPH_BODY_PILETOP_OFF + i].name,
                 C.mapNameSize, "%s %s", "piletop body of", buf, C.genSnprintfSites[5]);
        C.callLocal(add_tileref, tilenum, C.GLYPH_MON_MALE_OFF + i, C.monsters_file,
                    file_entry, C.tilemap[C.GLYPH_MON_MALE_OFF + i].name, "");
        C.callLocal(add_tileref, tilenum, C.GLYPH_PET_MALE_OFF + i, C.monsters_file,
                    file_entry, C.tilemap[C.GLYPH_PET_MALE_OFF + i].name, "");
        C.callLocal(add_tileref, tilenum, C.GLYPH_DETECT_MALE_OFF + i, C.monsters_file,
                    file_entry, C.tilemap[C.GLYPH_DETECT_MALE_OFF + i].name,"");
        C.callLocal(add_tileref, tilenum, C.GLYPH_RIDDEN_MALE_OFF + i, C.monsters_file,
                    file_entry, C.tilemap[C.GLYPH_RIDDEN_MALE_OFF + i].name, "");
        C.callLocal(add_tileref, corpsetile, C.GLYPH_BODY_OFF + i, C.objects_file, C.CORPSE,
                    C.tilemap[C.GLYPH_BODY_OFF + i].name, "");
        C.callLocal(add_tileref, corpsetile, C.GLYPH_BODY_PILETOP_OFF + i, C.objects_file,
                    C.CORPSE, C.tilemap[C.GLYPH_BODY_PILETOP_OFF + i].name, "");



        tilenum++;
        file_entry++;
        C.tilemap[C.GLYPH_MON_FEM_OFF + i].tilenum = tilenum;
        C.tilemap[C.GLYPH_PET_FEM_OFF + i].tilenum = tilenum;
        C.tilemap[C.GLYPH_DETECT_FEM_OFF + i].tilenum = tilenum;
        C.tilemap[C.GLYPH_RIDDEN_FEM_OFF + i].tilenum = tilenum;
        C.Sprintf(buf, "%s (mnum=%d)", tilename(C.MON_GLYPH, file_entry, 0), i, C.genSprintfSites[1]);
        C.Snprintf(C.tilemap[C.GLYPH_MON_FEM_OFF + i].name, 
                 C.mapNameSize, "female %s", buf, C.genSnprintfSites[6]);
        C.Snprintf(C.tilemap[C.GLYPH_PET_FEM_OFF + i].name,
                 C.mapNameSize, "%s female %s", "pet",
                 buf, C.genSnprintfSites[7]);
        C.Snprintf(C.tilemap[C.GLYPH_DETECT_FEM_OFF + i].name,
                 C.mapNameSize, "%s female %s",
                 "detected", buf, C.genSnprintfSites[8]);
        C.Snprintf(C.tilemap[C.GLYPH_RIDDEN_FEM_OFF + i].name,
                 C.mapNameSize, "%s female %s",
                 "ridden", buf, C.genSnprintfSites[9]);
        C.Snprintf(C.tilemap[C.GLYPH_BODY_OFF + i].name,
                 C.mapNameSize, "%s %s", "body of", buf, C.genSnprintfSites[10]);
        C.Snprintf(C.tilemap[C.GLYPH_BODY_PILETOP_OFF + i].name,
                 C.mapNameSize, "%s %s",
                 "piletop body of", buf, C.genSnprintfSites[11]);
        C.callLocal(add_tileref, tilenum, C.GLYPH_MON_FEM_OFF + i, C.monsters_file,
                    file_entry, C.tilemap[C.GLYPH_MON_FEM_OFF + i].name, "");
        C.callLocal(add_tileref, tilenum, C.GLYPH_PET_FEM_OFF + i, C.monsters_file,
                    file_entry, C.tilemap[C.GLYPH_PET_FEM_OFF + i].name, "");
        C.callLocal(add_tileref, tilenum, C.GLYPH_DETECT_FEM_OFF + i, C.monsters_file,
                    file_entry, C.tilemap[C.GLYPH_DETECT_FEM_OFF + i].name, "");
        C.callLocal(add_tileref, tilenum, C.GLYPH_RIDDEN_FEM_OFF + i, C.monsters_file,
                    file_entry, C.tilemap[C.GLYPH_RIDDEN_FEM_OFF + i].name, "");
        C.callLocal(add_tileref, corpsetile, C.GLYPH_BODY_OFF + i, C.objects_file, C.CORPSE,
                    C.tilemap[C.GLYPH_BODY_OFF + i].name, "");
        C.callLocal(add_tileref, corpsetile, C.GLYPH_BODY_PILETOP_OFF + i, C.objects_file,
                    corpsetile, C.tilemap[C.GLYPH_BODY_PILETOP_OFF + i].name, "");




        for (condnum = 0; C.conditionals[condnum].sequence != -1; condnum++) {
            if (C.conditionals[condnum].sequence == C.MON_GLYPH
                && C.conditionals[condnum].predecessor == i) {
                tilenum += 2;       /* male and female */
                file_entry += 2;
                C.Fprintf(C.tilemap_file, "skipping monst %s (%d)\n",
                        tilename(C.MON_GLYPH, file_entry, 0), file_entry, C.genFprintfSites[51]);



            }
        }
        tilenum++; /* male + female tiles for each */
        file_entry++;
    }
    C.tilemap[C.GLYPH_INVISIBLE].tilenum = tilenum;
    C.Sprintf(C.tilemap[C.GLYPH_INVISIBLE].name, "%s (mnum=%d)", "invisible mon",
            file_entry, C.genSprintfSites[2]);
    C.callLocal(add_tileref, tilenum, C.GLYPH_INVISIBLE, C.monsters_file,
                file_entry, C.tilemap[C.GLYPH_INVISIBLE].name, "invisible ");



    C.lastmontile = tilenum;
    tilenum++;
    file_entry++; /* non-productive, but in case something ever gets
                     inserted right below here ahead of objects */

    /* start of objects */
    file_entry = 0;
    for (i = 0; i < C.NUM_OBJECTS; i++) {
        C.tilemap[C.GLYPH_OBJ_OFF + i].tilenum = tilenum;
        C.tilemap[C.GLYPH_OBJ_PILETOP_OFF + i].tilenum = tilenum;
        C.Snprintf(C.tilemap[C.GLYPH_OBJ_OFF + i].name,
                 C.mapNameSize,
                 "%s (onum=%d)",
                tilename(C.OBJ_GLYPH, file_entry, 0), i, C.genSnprintfSites[12]);
        C.Snprintf(C.tilemap[C.GLYPH_OBJ_PILETOP_OFF + i].name,
                 C.mapNameSize,
                 "%s %s (onum=%d)",
                 "piletop", tilename(C.OBJ_GLYPH, file_entry, 0), i, C.genSnprintfSites[13]);
        C.callLocal(add_tileref, tilenum, C.GLYPH_OBJ_OFF + i,
                    C.objects_file, file_entry,
                    C.tilemap[C.GLYPH_OBJ_OFF + i].name, "");
        C.callLocal(add_tileref, tilenum, C.GLYPH_OBJ_PILETOP_OFF + i,
                    C.objects_file, file_entry,
                    C.tilemap[C.GLYPH_OBJ_PILETOP_OFF + i].name, "");



        for (condnum = 0; C.conditionals[condnum].sequence != -1; condnum++) {
            if (C.conditionals[condnum].sequence == C.OBJ_GLYPH
                && C.conditionals[condnum].predecessor == i) {
                tilenum++;
                file_entry++;
                C.Fprintf(C.tilemap_file, "skipping obj %s (%d)\n",
                        tilename(C.OBJ_GLYPH, file_entry, 0), file_entry, C.genFprintfSites[52]);



            }
        }
        tilenum++;
        file_entry++;
    }
    C.lastobjtile = tilenum - 1;

    file_entry = 0;
    /* S_stone */
    cmap = C.S_stone;
    precheck((C.GLYPH_CMAP_STONE_OFF), "stone");
    C.tilemap[C.GLYPH_CMAP_STONE_OFF].tilenum = tilenum;
    C.Snprintf(C.tilemap[C.GLYPH_CMAP_STONE_OFF].name,
            C.mapNameSize,
            "%s (cmap=%d)",
            tilename(C.OTH_GLYPH, file_entry, 0),
            cmap, C.genSnprintfSites[14]);
    C.callLocal(add_tileref, tilenum, C.GLYPH_CMAP_STONE_OFF,
                C.other_file, file_entry,
                C.tilemap[C.GLYPH_CMAP_STONE_OFF].name, "");



    C.TILE_stone = tilenum;   /* Used to init nul_glyphinfo tileidx entry */
    tilenum++;
    file_entry++;

    /* walls in the main dungeon */
    for (k = C.main_walls; k < C.mines_walls; k++) {
        offset = C.wall_offsets[k];
        for (cmap = C.S_vwall; cmap <= C.S_trwall; cmap++) {
            i = cmap - C.S_vwall;
            precheck(offset + i, "walls");
            C.tilemap[offset + i].tilenum = tilenum;
            C.Snprintf(C.tilemap[offset + i].name,
                    C.mapNameSize,
                    "%s (cmap=%d)",
                    tilename(C.OTH_GLYPH, file_entry, 0),
                    cmap, C.genSnprintfSites[15]);
            C.callLocal(add_tileref, tilenum, offset + i, C.other_file, file_entry,
                        C.tilemap[offset + i].name, "");



            for (condnum = 0; C.conditionals[condnum].sequence != -1;
                 condnum++) {
                if (C.conditionals[condnum].sequence == C.OTH_GLYPH
                    && C.conditionals[condnum].predecessor == cmap) {
                    tilenum++;
                    file_entry++;
                    C.Fprintf(C.tilemap_file, "skipping cmap %s (%d) (%d)\n",
                            tilename(C.OTH_GLYPH, file_entry, 0), file_entry,
                            cmap, C.genFprintfSites[53]);



                }
            }
            tilenum++;
            file_entry++;
        }
    }

    /* cmap A */
    for (cmap = C.S_ndoor; cmap <= C.S_brdnladder; cmap++) {
        i = cmap - C.S_ndoor;
        precheck((C.GLYPH_CMAP_A_OFF + i), "cmap A");
        C.tilemap[C.GLYPH_CMAP_A_OFF + i].tilenum = tilenum;
        C.Snprintf(C.tilemap[C.GLYPH_CMAP_A_OFF + i].name,
                 C.mapNameSize,
                 "cmap A %s (cmap=%d)",
                 tilename(C.OTH_GLYPH, file_entry, 0), cmap, C.genSnprintfSites[16]);
        C.callLocal(add_tileref, tilenum, C.GLYPH_CMAP_A_OFF + i, C.other_file, file_entry,
                    C.tilemap[C.GLYPH_CMAP_A_OFF + i].name, "");



        for (condnum = 0; C.conditionals[condnum].sequence != -1; condnum++) {
            if (C.conditionals[condnum].sequence == C.OTH_GLYPH
                && C.conditionals[condnum].predecessor == cmap) {
                tilenum++;
                file_entry++;
                C.Fprintf(C.tilemap_file, "skipping cmap A %s (%d) (%d)\n",
                        tilename(C.OTH_GLYPH, file_entry, 0), file_entry, cmap, C.genFprintfSites[54]);



            }
        }
        if (cmap == C.S_corr)
            C.TILE_corr = tilenum;    /* X11 references this tile during tile init */
        tilenum++;
        file_entry++;
    }

    /* Altars */
    cmap = C.S_altar;
    j = 0;
    for (k = C.altar_unaligned; k <= C.altar_other; k++) {
        offset = C.GLYPH_ALTAR_OFF + j;
        precheck((offset), "altar");
        C.tilemap[offset].tilenum = tilenum;
        C.Snprintf(C.tilemap[offset].name,
                 C.mapNameSize,
                "%s %s (cmap=%d)",
                C.altar_text[j], tilename(C.OTH_GLYPH, file_entry, 0), cmap, C.genSnprintfSites[17]);
        C.callLocal(add_tileref, tilenum, offset, C.other_file, file_entry,
                    C.tilemap[offset].name, "");



        for (condnum = 0; C.conditionals[condnum].sequence != -1; condnum++) {
            if (C.conditionals[condnum].sequence == C.OTH_GLYPH
                && C.conditionals[condnum].predecessor == cmap) {
                C.Fprintf(C.tilemap_file, "skipping %s %s (%d)\n",
                        C.altar_text[j],
                        tilename(C.OTH_GLYPH, file_entry, 0), cmap, C.genFprintfSites[55]);



                tilenum++;
                file_entry++;
            }
        }
        j++;
        tilenum++;
        file_entry++;
    }

    /* cmap B */
    for (cmap = C.S_grave; cmap < C.S_arrow_trap + C.MAXTCHARS; cmap++) {
        i = cmap - C.S_grave;
        precheck((C.GLYPH_CMAP_B_OFF + i), "cmap B");
        C.tilemap[C.GLYPH_CMAP_B_OFF + i].tilenum = tilenum;
        C.Snprintf(C.tilemap[C.GLYPH_CMAP_B_OFF + i].name,
                 C.mapNameSize,
                "%s (cmap=%d)",
                tilename(C.OTH_GLYPH, file_entry, 0), cmap, C.genSnprintfSites[18]);
        C.callLocal(add_tileref, tilenum, C.GLYPH_CMAP_B_OFF + i, C.other_file, file_entry,
                    C.tilemap[C.GLYPH_CMAP_B_OFF + i].name, "");



        for (condnum = 0; C.conditionals[condnum].sequence != -1; condnum++) {
            if (C.conditionals[condnum].sequence == C.OTH_GLYPH
                && C.conditionals[condnum].predecessor == cmap) {
                tilenum++;
                file_entry++;
                C.Fprintf(C.tilemap_file, "skipping cmap %s (%d) (%d)\n",
                        tilename(C.OTH_GLYPH, file_entry, 0), file_entry, cmap, C.genFprintfSites[56]);



            }
        }
        tilenum++;
        file_entry++;
    }

    /* zaps */

    for (i = 0; i < C.NUM_ZAP << 2; i++) {
        C.tilemap[C.GLYPH_ZAP_OFF + i].tilenum = tilenum;
        C.Snprintf(C.tilemap[C.GLYPH_ZAP_OFF + i].name,
                 C.mapNameSize,
                "zap %s (cmap=%d)",
                tilename(C.OTH_GLYPH, file_entry, 0), (i >> 2), C.genSnprintfSites[19]);
        C.callLocal(add_tileref, tilenum, C.GLYPH_ZAP_OFF + i, C.other_file, file_entry,
                    C.tilemap[C.GLYPH_ZAP_OFF + i].name, "");



        tilenum++;
        file_entry++;
        for (condnum = 0; C.conditionals[condnum].sequence != -1; condnum++) {
            if (C.conditionals[condnum].sequence == C.OTH_GLYPH
               && C.conditionals[condnum].predecessor == (i + C.MAXEXPCHARS)) {
                C.Fprintf(C.tilemap_file, "skipping zap %s (%d)\n",
                        tilename(C.OTH_GLYPH, file_entry, 0), file_entry, C.genFprintfSites[57]);



                file_entry++;
                tilenum++;
           }
        }
    }



    /* cmap C */
    for (cmap = C.S_digbeam; cmap <= C.S_goodpos; cmap++) {
        i = cmap - C.S_digbeam;
        precheck((C.GLYPH_CMAP_C_OFF + i), "cmap C");
        C.tilemap[C.GLYPH_CMAP_C_OFF + i].tilenum = tilenum;
        C.Snprintf(C.tilemap[C.GLYPH_CMAP_C_OFF + i].name,
                 C.mapNameSize,
                 "%s (cmap=%d)",
                 tilename(C.OTH_GLYPH, file_entry, 0), cmap, C.genSnprintfSites[20]);
        C.callLocal(add_tileref, tilenum, C.GLYPH_CMAP_C_OFF + i, C.other_file, file_entry,
                    C.tilemap[C.GLYPH_CMAP_C_OFF + i].name, "");



        for (condnum = 0; C.conditionals[condnum].sequence != -1; condnum++) {
            if (C.conditionals[condnum].sequence == C.OTH_GLYPH
                && C.conditionals[condnum].predecessor == cmap) {
                tilenum++;
                file_entry++;
                C.Fprintf(C.tilemap_file, "skipping cmap %s (%d) (%d)\n",
                        tilename(C.OTH_GLYPH, file_entry, 0), file_entry, cmap, C.genFprintfSites[58]);



            }
        }
        tilenum++;
        file_entry++;
    }
    /* swallow */
    const swallow_text = [
        "swallow top left",      "swallow top center",
        "swallow top right",     "swallow middle left",
        "swallow middle right",  "swallow bottom left",
        "swallow bottom center", "swallow bottom right",
    ];

    offset = C.GLYPH_SWALLOW_OFF;
    for (k = 0; k < C.NUMMONS; k++) {
//        if (k == 0) {
//            swallowbase = tilenum;
//        }
        for (cmap = C.S_sw_tl; cmap <= C.S_sw_br; cmap++) {
            i = cmap - C.S_sw_tl;
            precheck((offset + i), "swallows");
            C.tilemap[offset + i].tilenum = swallowbase + i;
            C.Snprintf(C.tilemap[offset + i].name,
                     C.mapNameSize,
                     "%s %s (cmap=%d)",
                     swallow_text[i],
                     C.mons[k].pmnames[C.NEUTRAL], cmap, C.genSnprintfSites[21]);
            C.callLocal(add_tileref, swallowbase + i, offset + i,
                        C.other_file, file_entry + i,
                        C.tilemap[offset + i].name, "");



        }
        offset += ((C.S_sw_br - C.S_sw_tl) + 1);
    }
    tilenum += ((C.S_sw_br - C.S_sw_tl) + 1);
    file_entry += ((C.S_sw_br - C.S_sw_tl) + 1);

    /* explosions */
    for (k = C.expl_dark; k <= C.expl_frosty; k++) {
        offset = C.expl_offsets[k];
        for (cmap = C.S_expl_tl; cmap <= C.S_expl_br; cmap++) {
            i = cmap - C.S_expl_tl;
            precheck((offset + i), "explosions");
            C.tilemap[offset + i].tilenum = tilenum;
            C.Snprintf(C.tilemap[offset + i].name,
                     C.mapNameSize,
                     "%s (cmap=%d)",
                     tilename(C.OTH_GLYPH, file_entry, 0), cmap, C.genSnprintfSites[22]);
            C.callLocal(add_tileref, tilenum, offset + i, C.other_file, file_entry,
                        C.tilemap[offset + i].name, "");




            for (condnum = 0; C.conditionals[condnum].sequence != -1;
                 condnum++) {
                if (C.conditionals[condnum].sequence == C.OTH_GLYPH
                    && C.conditionals[condnum].predecessor == cmap) {
                    C.Fprintf(C.tilemap_file, "skipping cmap %s (%d)\n",
                            tilename(C.OTH_GLYPH, file_entry, 0), cmap, C.genFprintfSites[59]);



                    tilenum++;
                    file_entry++;
                }
            }
            tilenum++;
            file_entry++;
        }
    }

    for (i = 0; i < C.WARNCOUNT; i++) {
        precheck((C.GLYPH_WARNING_OFF + i), "warnings");
        C.tilemap[C.GLYPH_WARNING_OFF + i].tilenum = tilenum;
        C.Snprintf(C.tilemap[C.GLYPH_WARNING_OFF + i].name,
                 C.mapNameSize,
                 "%s (warn=%d)",
                 tilename(C.OTH_GLYPH, file_entry, 0), file_entry, C.genSnprintfSites[23]);
        C.callLocal(add_tileref, tilenum, C.GLYPH_WARNING_OFF + i, C.other_file, file_entry,
                    C.tilemap[C.GLYPH_WARNING_OFF + i].name, "");



        tilenum++;
        file_entry++;
    }

    for (i = 0; i < 1; i++) {
        precheck((C.GLYPH_UNEXPLORED_OFF + i), "unexplored");
        C.tilemap[C.GLYPH_UNEXPLORED_OFF + i].tilenum = tilenum;
        C.Snprintf(C.tilemap[C.GLYPH_UNEXPLORED_OFF + i].name,
                 C.mapNameSize,
                 "unexplored %s (%d)",
                 C.tilemap[C.GLYPH_UNEXPLORED_OFF + i].name, file_entry, C.genSnprintfSites[24]);
        C.callLocal(add_tileref, tilenum, C.GLYPH_UNEXPLORED_OFF + i, C.other_file, file_entry,
                    C.tilemap[C.GLYPH_UNEXPLORED_OFF + i].name, "");



        C.TILE_unexplored = tilenum;      /* for writing into tiledef.h */
        tilenum++;
        file_entry++;
    }

    for (i = 0; i < 1; i++) {
        precheck(C.GLYPH_NOTHING + i, "nothing");
        C.tilemap[C.GLYPH_NOTHING + i].tilenum = tilenum;
        C.Snprintf(C.tilemap[C.GLYPH_NOTHING + i].name,
                 C.mapNameSize,
                 " nothing %s (%d)",
                 tilename(C.OTH_GLYPH, file_entry, 0), file_entry, C.genSnprintfSites[25]);
        C.callLocal(add_tileref, tilenum, C.GLYPH_NOTHING + i, C.other_file, file_entry,
                    C.tilemap[C.GLYPH_NOTHING + i].name, "");



        C.TILE_nothing = tilenum;      /* for writing into tiledef.h */
        tilenum++;
        file_entry++;
    }
    /* other walls beyond the main walls  */
    for (k = C.mines_walls; k <= C.sokoban_walls; k++) {
        offset = C.wall_offsets[k];
        for (cmap = C.S_vwall; cmap <= C.S_trwall; cmap++) {
            i = cmap - C.S_vwall;
            precheck(offset + i, "walls");
            C.tilemap[offset + i].tilenum = tilenum;
            C.Snprintf(C.tilemap[offset + i].name,
                     C.mapNameSize,
                     "%s (cmap=%d)",
                     tilename(C.OTH_GLYPH, file_entry, 0),
                     cmap, C.genSnprintfSites[26]);
            C.callLocal(add_tileref, tilenum, offset + i, C.other_file, file_entry,
                        C.tilemap[offset + i].name, "");



            for (condnum = 0; C.conditionals[condnum].sequence != -1; condnum++) {
                if (C.conditionals[condnum].sequence == C.OTH_GLYPH
                    && C.conditionals[condnum].predecessor == cmap) {
                    tilenum++;
                    file_entry++;
                    C.Fprintf(C.tilemap_file, "skipping cmap %s (%d) (%d)\n",
                            tilename(C.OTH_GLYPH, file_entry, 0), file_entry, cmap, C.genFprintfSites[60]);



                }
            }
            tilenum++;
            file_entry++;
        }
    }

/* statue patch: statues still use the same glyph as in 3.4.x */


    C.lastothtile = tilenum - 1;

    /* STATUES _DO_ LOOK LIKE MONSTERS */
    file_entry = 0;
    /* statue patch: statues look more like the monster */
    for (i = 0; i < C.NUMMONS; i++) {
        precheck(C.GLYPH_STATUE_MALE_OFF + i, "male statues");
        C.tilemap[C.GLYPH_STATUE_MALE_OFF + i].tilenum = tilenum;
        precheck(C.GLYPH_STATUE_MALE_PILETOP_OFF + i, "male statue piletop");
        C.tilemap[C.GLYPH_STATUE_MALE_PILETOP_OFF + i].tilenum = tilenum;
        C.Snprintf(C.tilemap[C.GLYPH_STATUE_MALE_OFF + i].name,
                C.mapNameSize,
                "statue of male %s (mnum=%d)",
                tilename(C.MON_GLYPH, file_entry, 0), i, C.genSnprintfSites[27]);
        C.Snprintf(C.tilemap[C.GLYPH_STATUE_MALE_PILETOP_OFF + i].name,
                C.mapNameSize,
                "piletop statue of male %s (mnum=%d)",
                tilename(C.MON_GLYPH, file_entry, 0), i, C.genSnprintfSites[28]);
        C.callLocal(add_tileref, tilenum, C.GLYPH_STATUE_MALE_OFF + i, C.generated, file_entry,
                    C.tilemap[C.GLYPH_STATUE_MALE_OFF + i].name,
                    "");
        C.callLocal(add_tileref, tilenum, C.GLYPH_STATUE_MALE_PILETOP_OFF + i, C.generated,
                    file_entry,
                    C.tilemap[C.GLYPH_STATUE_MALE_PILETOP_OFF + i].name,
                    "");



        tilenum++;
        file_entry++;
        precheck(C.GLYPH_STATUE_FEM_OFF + i, "female statues");
        C.tilemap[C.GLYPH_STATUE_FEM_OFF + i].tilenum = tilenum;
        precheck(C.GLYPH_STATUE_FEM_PILETOP_OFF + i, "female statue piletop");
        C.tilemap[C.GLYPH_STATUE_FEM_PILETOP_OFF + i].tilenum = tilenum;
        C.Snprintf(C.tilemap[C.GLYPH_STATUE_FEM_OFF + i].name,
                C.mapNameSize,
                "statue of female %s (mnum=%d)",
                tilename(C.MON_GLYPH, file_entry, 0), i, C.genSnprintfSites[29]);
        C.Sprintf(C.tilemap[C.GLYPH_STATUE_FEM_PILETOP_OFF + i].name,
                "piletop statue of female %s (mnum=%d)",
                tilename(C.MON_GLYPH, file_entry, 0), i, C.genSprintfSites[3]);
        C.callLocal(add_tileref, tilenum, C.GLYPH_STATUE_FEM_OFF + i, C.generated, file_entry,
                    C.tilemap[C.GLYPH_STATUE_FEM_OFF + i].name, "");
        C.callLocal(add_tileref, tilenum, C.GLYPH_STATUE_FEM_PILETOP_OFF + i, C.generated,
                    file_entry,
                    C.tilemap[C.GLYPH_STATUE_FEM_PILETOP_OFF + i].name, "");



        for (condnum = 0; C.conditionals[condnum].sequence != -1; condnum++) {
            if (C.conditionals[condnum].sequence == C.MON_GLYPH
                && C.conditionals[condnum].predecessor == i) {
                file_entry += 2; /* skip female tile too */
                tilenum += 2;
                C.Fprintf(C.tilemap_file, "skipping statue of %s (%d)\n",
                        tilename(C.MON_GLYPH, file_entry, 0), file_entry, C.genFprintfSites[61]);



            }
        }
        tilenum++;
        file_entry++;
    }
    /* go beyond NUMMONS to cover off the invisible tile at the
       end of monsters.txt so that the tile mapping matches things
       in the .bmp file (for example) */
    file_entry = 0;
    C.callLocal(add_tileref, tilenum, C.NO_GLYPH, C.monsters_file, file_entry,
                "invisible statue", "");



    C.laststatuetile = tilenum - 1;


/* STATUES_DONT_LOOK_LIKE_MONSTERS */

    for (i = 0; i < C.MAX_GLYPH; ++i) {
        C.Fprintf(C.tilemap_file, "glyph[%04d] [%04d] %-80s\n",
                i, C.tilemap[i].tilenum, C.tilemap[i].name, C.genFprintfSites[62]);
    }
    dump_tilerefs(C.tilemap_file);
    C.fclose(C.tilemap_file);



}

export function main(argc, argv)
{
    let i, tilenum;
    const filename = C.bytesLocal(30);
    let ofp;
    let enhanced;
    const indent = "    ";

    C.objects_globals_init();
    C.monst_globals_init();




    init_tilemap();

    enhanced = ", utf8rep";



    /*
     * create the source file, "tile.c"
     */
    C.Snprintf(filename, 30n, C.SOURCE_TEMPLATE, C.TILE_FILE, C.genSnprintfSites[30]);
    if (!(ofp = C.fopen(filename, "w"))) {
        C.perror(filename);
        C.exit(C.EXIT_FAILURE);
    }
    C.Fprintf(ofp,
            "/* This file is automatically generated.  Do not edit. */\n", C.genFprintfSites[63]);
    C.Fprintf(ofp, "\n#include \"hack.h\"\n", C.genFprintfSites[64]);
    C.Fprintf(ofp, "\n#ifndef TILES_IN_GLYPHMAP\n", C.genFprintfSites[65]);
    C.Fprintf(ofp, "\n#else /* ?TILES_IN_GLYPHMAP */\n", C.genFprintfSites[66]);
    C.Fprintf(ofp, "\nenum special_tiles {\n", C.genFprintfSites[67]);
    C.Fprintf(ofp, "    TILE_CORR = %d,\n", C.TILE_corr, C.genFprintfSites[68]); 
    C.Fprintf(ofp, "    TILE_STONE = %d,\n", C.TILE_stone, C.genFprintfSites[69]); 
    C.Fprintf(ofp, "    TILE_UNEXPLORED = %d\n", C.TILE_unexplored, C.genFprintfSites[70]);
    C.Fprintf(ofp, "};\n", C.genFprintfSites[71]);
    C.Fprintf(ofp, "\nint total_tiles_used = %d,\n", C.laststatuetile + 1, C.genFprintfSites[72]);
    C.Fprintf(ofp, "%sTile_corr = TILE_CORR,\n", indent, C.genFprintfSites[73]); /* X11 uses it */
    C.Fprintf(ofp, "%sTile_stone = TILE_STONE,\n",  indent, C.genFprintfSites[74]);
    C.Fprintf(ofp, "%sTile_unexplored = TILE_UNEXPLORED,\n",  indent, C.genFprintfSites[75]);
    C.Fprintf(ofp, "%smaxmontile = %d,\n", indent, C.lastmontile, C.genFprintfSites[76]);
    C.Fprintf(ofp, "%smaxobjtile = %d,\n", indent, C.lastobjtile, C.genFprintfSites[77]);
    C.Fprintf(ofp, "%smaxothtile = %d;\n\n", indent, C.lastothtile, C.genFprintfSites[78]);
    C.Fprintf(ofp, "#define NO_CUSTOMCOLOR (0U)\n\n", C.genFprintfSites[79]);
    C.Fprintf(ofp, "/* glyph, ttychar, { %s%s } */\n",
            "glyphflags, { NO_COLOR, symidx }, NO_CUSTOMCOLOR, NO_CUSTOMCOLOR, ovidx, tileidx", enhanced, C.genFprintfSites[80]);
    enhanced = ", 0"; /* replace ", utf8rep" since we're done with that */



    C.Fprintf(ofp, "const glyph_info nul_glyphinfo = {\n", C.genFprintfSites[81]);
    C.Fprintf(ofp, "%sNO_GLYPH, ' ', NO_COLOR,\n", indent, C.genFprintfSites[82]);
    C.Fprintf(ofp, "%s%s/* glyph_map */\n", indent, indent, C.genFprintfSites[83]);
    C.Fprintf(ofp, "%s%s{ %s, TILE_UNEXPLORED%s }\n", indent, indent,
            "MG_UNEXPL, { NO_COLOR, SYM_UNEXPLORED + SYM_OFF_X }, NO_CUSTOMCOLOR, NO_CUSTOMCOLOR",
            enhanced, C.genFprintfSites[84]);
    C.Fprintf(ofp, "};\n", C.genFprintfSites[85]);
    C.Fprintf(ofp, "\nglyph_map glyphmap[MAX_GLYPH] = {\n", C.genFprintfSites[86]);

    for (i = 0; i < C.MAX_GLYPH; i++) {
        tilenum = C.tilemap[i].tilenum;
        if (tilenum < 0) { /* will be -1 if not assigned a real value */
            C.Fprintf(C.stderr, "ERROR: glyph %d maps to tile %d.\n", i, tilenum, C.genFprintfSites[87]);
            C.fclose(ofp);
            C.unlink(filename);
            C.exit(C.EXIT_FAILURE);
            /*NOTREACHED*/
        }
        C.Fprintf(ofp,
                "    { 0U, { NO_COLOR, 0 }, NO_CUSTOMCOLOR, NO_CUSTOMCOLOR, %4d%s },   /* [%04d] %s:%03d %s */\n",
                tilenum, enhanced, i,
                C.tilesrc_texts[C.tilelist[tilenum].src],
                C.tilelist[tilenum].file_entry,
                C.tilemap[i].name, C.genFprintfSites[88]);
    }
    C.Fprintf(ofp, "};\n", C.genFprintfSites[89]);
    C.Fprintf(ofp, "\n#endif /* TILES_IN_GLYPHMAP */\n", C.genFprintfSites[90]);
    C.Fprintf(ofp, "\n/*tile.c*/\n", C.genFprintfSites[91]);

    C.fclose(ofp);
    free_tilerefs();
    C.exit(C.EXIT_SUCCESS);
    /*NOTREACHED*/
    C.nhUse(argc);
    C.nhUse(argv);
    return 0;
}

/* TILETEXT */
