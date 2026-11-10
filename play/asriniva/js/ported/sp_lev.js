import { C } from './c-runtime.js';
/* NetHack 5.0	sp_lev.c	$NHDT-Date: 1737610109 2025/01/22 21:28:29 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.373 $ */
/*      Copyright (c) 1989 by Jean-Christophe Collet */
/* NetHack may be freely redistributed.  See license for details. */
/*
 * This file contains the various functions that are related to the special
 * levels.
 *
 * It contains also the special level loader.
 */
/* macosx complains that these are unused */
/* lua_CFunction prototypes */
/*
     * No need for 'struct instance_globals g' to contain these.
     * sp_level_coder_init() always re-initializes them prior to use.
     */
export const splev_init_present=C=>0;
export const icedpools=C=>0;
/* positions touched by level elements explicitly defined in the level */
export const SpLev_Map=C=>0;
export const container_idx=C=>0;
/* next slot in container_obj[] to use */
export const container_obj=C=>0;
export const invent_carrying_monster=C=>0;
/*
     * end of no 'g.'
     */
export function reset_xystart_size()
{
    (C.field(C.gx,"instance_globals_x","xstart").value=C.i16(1));
    /* column [0] is off limits */
    (C.field(C.gy,"instance_globals_y","ystart").value=C.i16(0));
    (C.field(C.gx,"instance_globals_x","xsize").value=C.i16(C.i32((80-1))));
    /* 1..COLNO-1 */
    (C.field(C.gy,"instance_globals_y","ysize").value=C.i16(21));
    /* 0..ROWNO-1 */
}

/* Does typ match with levl[][].typ, considering special types
   MATCH_WALL and MAX_TYPE (aka transparency)? */
export function match_maptyps(typ,levltyp)
{
    typ=C.i16(typ);
    levltyp=C.i16(levltyp);
    if(Number(!!((Number(C.i32(typ)==C.MATCH_WALL))&&Number(!((Number(C.i32((levltyp))<=C.DBWALL))))))) return (C.i8(0));
    if(Number(!!((Number(C.i32(typ)<C.MAX_TYPE))&&(Number(C.i32(typ)!=C.i32(levltyp)))))) return (C.i8(0));
    return (C.i8(1));
}

export function mapfrag_fromstr(str)
{
    let mf=C.alloc(C.u32(BigInt(C.sizes["struct mapfragment"])));
    let tmps;
    (C.field(mf,"mapfragment","data").value=C.dupstr(str));
    C.stripdigits(C.field(mf,"mapfragment","data").value);
    (C.field(mf,"mapfragment","wid").value=C.str_lines_maxlen(C.field(mf,"mapfragment","data").value));
    (C.field(mf,"mapfragment","hei").value=0);
    (tmps=C.field(mf,"mapfragment","data").value);
    while(Number(!!(tmps&&C.i32(C.cell(tmps,"char").value)))) {
        let s1=C.strchr(tmps,10);
        if(Number(C.field(mf,"mapfragment","hei").value>21)) {
            C.free(C.field(mf,"mapfragment","data").value);
            C.free(mf);
            return 0;
        }
        if(s1) (()=>{const old=s1;const next=C.ptr((old+Number(1)));s1=next;return old;})();
        (tmps=s1);
        (()=>{const slot=C.field(mf,"mapfragment","hei");const old=slot.value;const next=C.i32((old+1));slot.value=next;return old;})();
    }
    return mf;
}

export function mapfrag_free(mf)
{
    if(Number(!!(mf&&C.cell(mf,"struct mapfragment *").value))) {
        C.free(C.field((C.cell(mf,"struct mapfragment *").value),"mapfragment","data").value);
        C.free(C.cell(mf,"struct mapfragment *").value);
        (C.cell(mf,"struct mapfragment *").value=0);
    }
}

export function mapfrag_get(mf,x,y)
{
    x=C.i32(x);
    y=C.i32(y);
    if(Number(!!(Number(!!(Number(!!(Number(y<0)||Number(x<0)))||Number(y>C.i32((C.field(mf,"mapfragment","hei").value-1)))))||Number(x>C.i32((C.field(mf,"mapfragment","wid").value-1)))))) C.variadic(0,C.literal("outside mapfrag (%i,%i), wanted (%i,%i)"),C.field(mf,"mapfragment","wid").value,C.field(mf,"mapfragment","hei").value,x,y);
    return C.splev_chr2typ(C.cell((C.field(mf,"mapfragment","data").value+Number(C.i32((C.i32((y*(C.i32((C.field(mf,"mapfragment","wid").value+1)))))+x)))*1),"char").value);
}

export function mapfrag_canmatch(mf)
{
    return C.i8((Number(!!((C.i32((C.field(mf,"mapfragment","wid").value%2)))&&(C.i32((C.field(mf,"mapfragment","hei").value%2)))))));
}

export function mapfrag_error(mf)
{
    const stackFrame=C.stackSave();
    try {
    const mfAddress=C.stackAlloc(8);C.cell(mfAddress,"struct mapfragment *").value=mf;
    let res=0;
    if(Number(!(C.cell(mfAddress,"struct mapfragment *").value))) {
        (res=C.literal("mapfragment error"));
    } else if(Number(!(mapfrag_canmatch(C.cell(mfAddress,"struct mapfragment *").value)))) {
        mapfrag_free(mfAddress);
        (res=C.literal("mapfragment needs to have odd height and width"));
    } else if((Number(!!(Number(C.i32((mapfrag_get(C.cell(mfAddress,"struct mapfragment *").value,C.i32(Math.trunc((C.field(C.cell(mfAddress,"struct mapfragment *").value,"mapfragment","wid").value/2))),C.i32(Math.trunc((C.field(C.cell(mfAddress,"struct mapfragment *").value,"mapfragment","hei").value/2))))))==C.MAX_TYPE)||Number(C.i32((mapfrag_get(C.cell(mfAddress,"struct mapfragment *").value,C.i32(Math.trunc((C.field(C.cell(mfAddress,"struct mapfragment *").value,"mapfragment","wid").value/2))),C.i32(Math.trunc((C.field(C.cell(mfAddress,"struct mapfragment *").value,"mapfragment","hei").value/2))))))==C.INVALID_TYPE))))) {
        mapfrag_free(mfAddress);
        (res=C.literal("mapfragment center must be valid terrain"));
    }
    return res;
    } finally {C.stackRestore(stackFrame); }
}

export function mapfrag_match(mf,x,y)
{
    x=C.i32(x);
    y=C.i32(y);
    let rx; let ry;
    for((rx=C.i32((-(C.i32(Math.trunc((C.field(mf,"mapfragment","wid").value/2)))))));Number(rx<=(C.i32(Math.trunc((C.field(mf,"mapfragment","wid").value/2)))));(()=>{const old=rx;const next=C.i32((old+1));rx=next;return old;})()) for((ry=C.i32((-(C.i32(Math.trunc((C.field(mf,"mapfragment","hei").value/2)))))));Number(ry<=(C.i32(Math.trunc((C.field(mf,"mapfragment","hei").value/2)))));(()=>{const old=ry;const next=C.i32((old+1));ry=next;return old;})()) {
        let mapc=mapfrag_get(mf,C.i32((rx+(C.i32(Math.trunc((C.field(mf,"mapfragment","wid").value/2)))))),C.i32((ry+(C.i32(Math.trunc((C.field(mf,"mapfragment","hei").value/2)))))));
        let levc=C.i8((C.isok(C.i16(C.i32((x+rx))),C.i16(C.i32((y+ry))))?C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((x+rx)))*(C.sizes["struct rm"]*21))+Number(C.i32((y+ry)))*C.sizes["struct rm"]),"rm","typ").value):C.STONE));
        if(Number(!(match_maptyps(C.i16(mapc),C.i16(levc))))) return (C.i8(0));
    }

    return (C.i8(1));
}

export function solidify_map()
{
    let x; let y;
    for((x=C.i16(0));Number(C.i32(x)<80);(()=>{const old=x;const next=C.i16((old+1));x=next;return old;})()) for((y=C.i16(0));Number(C.i32(y)<21);(()=>{const old=y;const next=C.i16((old+1));y=next;return old;})()) if(Number(!!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))<=C.DBWALL))&&Number(!(C.cell(((C.SpLev_Map+Number(x)*(1*21))+Number(y)*1),"char").value))))) (()=>{const slot=C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags");const old=slot.value;const next=C.u32(C.i32(C.i32(old)|(C.i32((8|16)))));slot.value=next;return next;})();


}

/* do a post-level-creation cleanup of map, such as
   removing boulders and traps from lava */
export function map_cleanup()
{
    let otmp;
    let ttmp;
    let etmp;
    let x; let y;
    for((x=C.i16(0));Number(C.i32(x)<80);(()=>{const old=x;const next=C.i16((old+1));x=next;return old;})()) for((y=C.i16(0));Number(C.i32(y)<21);(()=>{const old=y;const next=C.i16((old+1));y=next;return old;})()) {
        let typ=C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value;
        if(Number(!!((Number(!!(Number(C.i32((typ))==C.LAVAPOOL)||Number(C.i32((typ))==C.LAVAWALL))))||(Number(!!(Number(C.i32((typ))>=C.POOL)&&Number(C.i32((typ))<=C.DRAWBRIDGE_UP))))))) {
            /* in case any boulders are on liquid, delete them */
            while(Number(((otmp=C.sobj_at(C.BOULDER,x,y)))!=0)) {
                C.obj_extract_self(otmp);
                C.obfree(otmp,0);
            }
            /* traps on liquid? */
            if(Number(!!((Number(((ttmp=C.t_at(x,y)))!=0))&&Number(!((Number(!!(Number(C.i32((C.field(ttmp,"trap","ttyp").value))==C.MAGIC_PORTAL)||Number(C.i32((C.field(ttmp,"trap","ttyp").value))==C.VIBRATING_SQUARE))))))))) C.deltrap(ttmp);
            /* engravings? */
            if(Number(((etmp=C.engr_at(x,y)))!=0)) C.del_engr(etmp);
        }
    }

}

export function lvlfill_maze_grid(x1,y1,x2,y2,filling)
{
    x1=C.i32(x1);
    y1=C.i32(y1);
    x2=C.i32(x2);
    y2=C.i32(y2);
    filling=C.i8(filling);
    let x; let y;
    for((x=x1);Number(x<=x2);(()=>{const old=x;const next=C.i32((old+1));x=next;return old;})()) for((y=y1);Number(y<=y2);(()=>{const old=y;const next=C.i32((old+1));y=next;return old;})()) {
        if(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","corrmaze").value) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value=C.i8(C.STONE));
 else (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value=C.i8(((Number(!!(Number(y<2)||(Number(!!((C.i32((x%2)))&&(C.i32((y%2)))))))))?C.STONE:C.i32(filling))));
    }

}

export function lvlfill_solid(filling,lit)
{
    filling=C.i8(filling);
    lit=C.i8(lit);
    let x; let y;
    for((x=2);Number(x<=C.field(C.gx,"instance_globals_x","x_maze_max").value);(()=>{const old=x;const next=C.i32((old+1));x=next;return old;})()) for((y=0);Number(y<=C.field(C.gy,"instance_globals_y","y_maze_max").value);(()=>{const old=y;const next=C.i32((old+1));y=next;return old;})()) {
        if(Number(!(C.set_levltyp_lit(C.i16(x),C.i16(y),filling,lit)))) continue;
        /* TODO: consolidate this w lspo_map ? */
        (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value=C.u32(0));
        (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","horizontal").value=C.u32(0));
        (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","roomno").value=C.u32(0));
        (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","edge").value=C.u32(0));
    }

}

export function lvlfill_swamp(fg,bg,lit)
{
    fg=C.i8(fg);
    bg=C.i8(bg);
    lit=C.i8(lit);
    let x; let y;
    lvlfill_solid(bg,lit);
    /* "relaxed blockwise maze" algorithm, Jamis Buck */
    for((x=2);Number(x<=((Number((C.field(C.gx,"instance_globals_x","x_maze_max").value)<(C.i32((80-2))))?(C.field(C.gx,"instance_globals_x","x_maze_max").value):(C.i32((80-2))))));(()=>{const old=x;const next=C.i32(C.i32(C.i32(old)+2));x=next;return next;})()) for((y=0);Number(y<=((Number((C.field(C.gy,"instance_globals_y","y_maze_max").value)<(C.i32((21-2))))?(C.field(C.gy,"instance_globals_y","y_maze_max").value):(C.i32((21-2))))));(()=>{const old=y;const next=C.i32(C.i32(C.i32(old)+2));y=next;return next;})()) {
        let c=0;
        C.set_levltyp_lit(C.i16(x),C.i16(y),fg,lit);
        if(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((x+1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.i32(bg))) (()=>{const old=c;const next=C.i32((old+1));c=next;return next;})();
        if(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((y+1)))*C.sizes["struct rm"]),"rm","typ").value)==C.i32(bg))) (()=>{const old=c;const next=C.i32((old+1));c=next;return next;})();
        if(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((x+1)))*(C.sizes["struct rm"]*21))+Number(C.i32((y+1)))*C.sizes["struct rm"]),"rm","typ").value)==C.i32(bg))) (()=>{const old=c;const next=C.i32((old+1));c=next;return next;})();
        if(Number(c==3)) {
            switch(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),410,(C.literal("lvlfill_swamp"))),C.rn2(3))):C.rn2(3)))) {
                case (0):
                    C.set_levltyp_lit(C.i16(C.i32((x+1))),C.i16(y),fg,lit);
                break;
                case (1):
                    C.set_levltyp_lit(C.i16(x),C.i16(C.i32((y+1))),fg,lit);
                break;
                case (2):
                    C.set_levltyp_lit(C.i16(C.i32((x+1))),C.i16(C.i32((y+1))),fg,lit);
                break;
                default:
                    break;
            }
        }
    }

}

export function flip_dbridge_horizontal(lev)
{
    if((Number(!!(Number(C.i32((C.field(lev,"rm","typ").value))==C.DRAWBRIDGE_UP)||Number(C.i32((C.field(lev,"rm","typ").value))==C.DRAWBRIDGE_DOWN))))) {
        if(Number((C.i32((C.i32(C.field(lev,"rm","flags").value)&3)))==3)) {
            (()=>{const slot=C.field(lev,"rm","flags");const old=slot.value;const next=C.u32(C.i32(C.i32(old)&C.i32((~3))));slot.value=next;return next;})();
            (()=>{const slot=C.field(lev,"rm","flags");const old=slot.value;const next=C.u32(C.i32(C.i32(old)|2));slot.value=next;return next;})();
        } else if(Number((C.i32((C.i32(C.field(lev,"rm","flags").value)&3)))==2)) {
            (()=>{const slot=C.field(lev,"rm","flags");const old=slot.value;const next=C.u32(C.i32(C.i32(old)&C.i32((~2))));slot.value=next;return next;})();
            (()=>{const slot=C.field(lev,"rm","flags");const old=slot.value;const next=C.u32(C.i32(C.i32(old)|3));slot.value=next;return next;})();
        }
    }
}

export function flip_dbridge_vertical(lev)
{
    if((Number(!!(Number(C.i32((C.field(lev,"rm","typ").value))==C.DRAWBRIDGE_UP)||Number(C.i32((C.field(lev,"rm","typ").value))==C.DRAWBRIDGE_DOWN))))) {
        if(Number((C.i32((C.i32(C.field(lev,"rm","flags").value)&3)))==0)) {
            (()=>{const slot=C.field(lev,"rm","flags");const old=slot.value;const next=C.u32(C.i32(C.i32(old)&C.i32((~0))));slot.value=next;return next;})();
            (()=>{const slot=C.field(lev,"rm","flags");const old=slot.value;const next=C.u32(C.i32(C.i32(old)|1));slot.value=next;return next;})();
        } else if(Number((C.i32((C.i32(C.field(lev,"rm","flags").value)&3)))==1)) {
            (()=>{const slot=C.field(lev,"rm","flags");const old=slot.value;const next=C.u32(C.i32(C.i32(old)&C.i32((~1))));slot.value=next;return next;})();
            (()=>{const slot=C.field(lev,"rm","flags");const old=slot.value;const next=C.u32(C.i32(C.i32(old)|0));slot.value=next;return next;})();
        }
    }
}

/* for #wizfliplevel; not needed when flipping during level creation;
   update seen vector for whole flip area and glyph for known walls */
export function flip_visuals(flp,minx,miny,maxx,maxy)
{
    flp=C.i32(flp);
    minx=C.i32(minx);
    miny=C.i32(miny);
    maxx=C.i32(maxx);
    maxy=C.i32(maxy);
    let lev;
    let x; let y; let seenv;
    for((y=miny);Number(y<=maxy);(()=>{const old=y;const next=C.i32((old+1));y=next;return next;})()) {
        for((x=minx);Number(x<=maxx);(()=>{const old=x;const next=C.i32((old+1));x=next;return next;})()) {
            (lev=((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]));
            (seenv=C.i32((C.i32(C.field(lev,"rm","seenv").value)&255)));
            /* locations which haven't been seen can be skipped */
            if(Number(seenv==0)) continue;
            /* flip <x,y>'s seen vector; not necessary for locations seen
               from all directions (the whole level after magic mapping) */
            if(Number(seenv!=C.i32((C.u8(255))))) {
                /* SV2 SV1 SV0 *
                 * SV3 -+- SV7 *
                 * SV4 SV5 SV6 */
                if(C.i32((flp&1))) {
                    /* swap top and bottom */
                    (seenv=C.swapbits(seenv,2,4));
                    (seenv=C.swapbits(seenv,1,5));
                    (seenv=C.swapbits(seenv,0,6));
                }
                if(C.i32((flp&2))) {
                    /* swap left and right */
                    (seenv=C.swapbits(seenv,2,0));
                    (seenv=C.swapbits(seenv,3,7));
                    (seenv=C.swapbits(seenv,4,6));
                }
                (C.field(lev,"rm","seenv").value=C.u8(seenv));
            }
            /* if <x,y> is displayed as a wall, reset its display glyph so
               that remembered, out of view T's and corners get flipped */
            if(Number(!!((Number(!!((Number(!!(C.i32((C.field(lev,"rm","typ").value))&&Number(C.i32((C.field(lev,"rm","typ").value))<=C.DBWALL))))||Number(C.i32(C.field(lev,"rm","typ").value)==C.SDOOR))))&&(Number(!!(Number((C.field(lev,"rm","glyph").value)>=C.GLYPH_CMAP_STONE_OFF)&&Number((C.field(lev,"rm","glyph").value)<(C.i32((C.GLYPH_CMAP_C_OFF+(C.i32(((C.i32((C.S_goodpos-C.S_digbeam)))+1))))))))))))) (C.field(lev,"rm","glyph").value=C.back_to_glyph(C.i16(x),C.i16(y)));
        }
    }
}

/* transpose an encoded direction */
export function flip_encoded_dir_bits(flp,val)
{
    flp=C.i32(flp);
    val=C.i32(val);
    /* these depend on xdir[] and ydir[] order */
    if(C.i32((flp&1))) {
        (val=C.swapbits(val,1,7));
        (val=C.swapbits(val,2,6));
        (val=C.swapbits(val,3,5));
    }
    if(C.i32((flp&2))) {
        (val=C.swapbits(val,1,3));
        (val=C.swapbits(val,0,4));
        (val=C.swapbits(val,7,5));
    }
    return val;
}

/* transpose top with bottom or left with right or both; sometimes called
   for new special levels, or for any level via the #wizfliplevel command */
export function flip_level(flp,extras)
{
    flp=C.i32(flp);
    extras=C.i8(extras);
    const stackFrame=C.stackSave();
    try {
    /* mask for orientation(s) to transpose */
    /* False: level creation; True: #wizfliplevel is
                     * altering an active level so more needs to be done */
    let x; let y; let i; let itmp;
    let minxAddress=C.stackAlloc(2); let minyAddress=C.stackAlloc(2); let maxxAddress=C.stackAlloc(2); let maxyAddress=C.stackAlloc(2);
    let trm=C.stackAlloc(C.sizes["struct rm"]);
    let ttmp;
    let otmp;
    let mtmp;
    let etmp;
    let sroom;
    let timer;
    let ball_active=(C.i8(0)); let ball_fliparea=(C.i8(0));
    let stway;
    let ez;
    /* nothing to do unless (flp & 1) or (flp & 2) or both */
    if(Number((C.i32((flp&3)))==0)) return;
    C.get_level_extends(minxAddress,minyAddress,maxxAddress,maxyAddress);
    /* get_level_extends() returns -1,-1 to COLNO,ROWNO at max */
    if(Number(C.i32(C.cell(minyAddress,"short").value)<0)) (C.cell(minyAddress,"short").value=C.i16(0));
    if(Number(C.i32(C.cell(minxAddress,"short").value)<1)) (C.cell(minxAddress,"short").value=C.i16(1));
    if(Number(C.i32(C.cell(maxxAddress,"short").value)>=80)) (C.cell(maxxAddress,"short").value=C.i16((C.i32((80-1)))));
    if(Number(C.i32(C.cell(maxyAddress,"short").value)>=21)) (C.cell(maxyAddress,"short").value=C.i16((C.i32((21-1)))));
    if(extras) {
        if(Number(!!((Number(C.global("uball").value!=0))&&Number(C.i32(C.field(C.global("uball").value,"obj","where").value)!=0)))) {
            (ball_active=(C.i8(1)));
            /* if hero and ball and chain are all inside flip area,
               flip b&c coordinates along with other objects; if they
               are all outside, leave them to be rejected when flipping
               so that they stay as is; if some are inside and some are
               outside, un-place here and subsequently re-place them on
               hero's [possibly new] spot below */
            if((Number(C.i32(C.field((C.global("uball").value),"obj","where").value)==3))) ((C.field(C.global("uball").value,"obj","ox").value=C.field(C.u,"you","ux").value),(C.field(C.global("uball").value,"obj","oy").value=C.field(C.u,"you","uy").value));
            (ball_fliparea=C.i8((Number(!!((Number((Number(!!(Number(!!(Number(!!(Number(C.i32((C.field(C.global("uball").value,"obj","ox").value))>=C.i32(C.cell(minxAddress,"short").value))&&Number(C.i32((C.field(C.global("uball").value,"obj","ox").value))<=C.i32(C.cell(maxxAddress,"short").value))))&&Number(C.i32((C.field(C.global("uball").value,"obj","oy").value))>=C.i32(C.cell(minyAddress,"short").value))))&&Number(C.i32((C.field(C.global("uball").value,"obj","oy").value))<=C.i32(C.cell(maxyAddress,"short").value)))))==(Number(!!(Number(!!(Number(!!(Number(C.i32((C.field(C.global("uchain").value,"obj","ox").value))>=C.i32(C.cell(minxAddress,"short").value))&&Number(C.i32((C.field(C.global("uchain").value,"obj","ox").value))<=C.i32(C.cell(maxxAddress,"short").value))))&&Number(C.i32((C.field(C.global("uchain").value,"obj","oy").value))>=C.i32(C.cell(minyAddress,"short").value))))&&Number(C.i32((C.field(C.global("uchain").value,"obj","oy").value))<=C.i32(C.cell(maxyAddress,"short").value)))))))&&(Number((Number(!!(Number(!!(Number(!!(Number(C.i32((C.field(C.global("uball").value,"obj","ox").value))>=C.i32(C.cell(minxAddress,"short").value))&&Number(C.i32((C.field(C.global("uball").value,"obj","ox").value))<=C.i32(C.cell(maxxAddress,"short").value))))&&Number(C.i32((C.field(C.global("uball").value,"obj","oy").value))>=C.i32(C.cell(minyAddress,"short").value))))&&Number(C.i32((C.field(C.global("uball").value,"obj","oy").value))<=C.i32(C.cell(maxyAddress,"short").value)))))==(Number(!!(Number(!!(Number(!!(Number(C.i32((C.field(C.u,"you","ux").value))>=C.i32(C.cell(minxAddress,"short").value))&&Number(C.i32((C.field(C.u,"you","ux").value))<=C.i32(C.cell(maxxAddress,"short").value))))&&Number(C.i32((C.field(C.u,"you","uy").value))>=C.i32(C.cell(minyAddress,"short").value))))&&Number(C.i32((C.field(C.u,"you","uy").value))<=C.i32(C.cell(maxyAddress,"short").value))))))))))));
            if(Number(!(ball_fliparea))) C.unplacebc();
        }
    }
    /* stairs and ladders */
    for((stway=C.field(C.gs,"instance_globals_s","stairs").value);stway;(stway=C.field(stway,"stairway","next").value)) {
        if(C.i32((flp&1))) (C.field(stway,"stairway","sy").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field(stway,"stairway","sy").value)))))+C.i32(C.cell(minyAddress,"short").value))))));
        if(C.i32((flp&2))) (C.field(stway,"stairway","sx").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field(stway,"stairway","sx").value)))))+C.i32(C.cell(minxAddress,"short").value))))));
    }
    /* traps */
    for((ttmp=C.field(C.gf,"instance_globals_f","ftrap").value);ttmp;(ttmp=C.field(ttmp,"trap","ntrap").value)) {
        if(Number(!((Number(!!(Number(!!(Number(!!(Number(C.i32((C.field(ttmp,"trap","tx").value))>=C.i32(C.cell(minxAddress,"short").value))&&Number(C.i32((C.field(ttmp,"trap","tx").value))<=C.i32(C.cell(maxxAddress,"short").value))))&&Number(C.i32((C.field(ttmp,"trap","ty").value))>=C.i32(C.cell(minyAddress,"short").value))))&&Number(C.i32((C.field(ttmp,"trap","ty").value))<=C.i32(C.cell(maxyAddress,"short").value)))))))) continue;
        if(C.i32((flp&1))) {
            (C.field(ttmp,"trap","ty").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field(ttmp,"trap","ty").value)))))+C.i32(C.cell(minyAddress,"short").value))))));
            if(Number(C.i32(C.field(ttmp,"trap","ttyp").value)==C.ROLLING_BOULDER_TRAP)) {
                (C.field(C.field(ttmp,"trap","launch").address,"nhcoord","y").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field(C.field(ttmp,"trap","launch").address,"nhcoord","y").value)))))+C.i32(C.cell(minyAddress,"short").value))))));
                (C.field(C.field(C.field(ttmp,"trap","vl").address,"vlaunchinfo","v_launch2").address,"nhcoord","y").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field(C.field(C.field(ttmp,"trap","vl").address,"vlaunchinfo","v_launch2").address,"nhcoord","y").value)))))+C.i32(C.cell(minyAddress,"short").value))))));
            } else if(Number(!!((Number(!!(Number(C.i32((C.field(ttmp,"trap","ttyp").value))==C.PIT)||Number(C.i32((C.field(ttmp,"trap","ttyp").value))==C.SPIKED_PIT))))&&C.i32(C.field(C.field(ttmp,"trap","vl").address,"vlaunchinfo","v_conjoined").value)))) {
                (C.field(C.field(ttmp,"trap","vl").address,"vlaunchinfo","v_conjoined").value=C.u8(flip_encoded_dir_bits(flp,C.i32(C.field(C.field(ttmp,"trap","vl").address,"vlaunchinfo","v_conjoined").value))));
            }
        }
        if(C.i32((flp&2))) {
            (C.field(ttmp,"trap","tx").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field(ttmp,"trap","tx").value)))))+C.i32(C.cell(minxAddress,"short").value))))));
            if(Number(C.i32(C.field(ttmp,"trap","ttyp").value)==C.ROLLING_BOULDER_TRAP)) {
                (C.field(C.field(ttmp,"trap","launch").address,"nhcoord","x").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field(C.field(ttmp,"trap","launch").address,"nhcoord","x").value)))))+C.i32(C.cell(minxAddress,"short").value))))));
                (C.field(C.field(C.field(ttmp,"trap","vl").address,"vlaunchinfo","v_launch2").address,"nhcoord","x").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field(C.field(C.field(ttmp,"trap","vl").address,"vlaunchinfo","v_launch2").address,"nhcoord","x").value)))))+C.i32(C.cell(minxAddress,"short").value))))));
            } else if(Number(!!((Number(!!(Number(C.i32((C.field(ttmp,"trap","ttyp").value))==C.PIT)||Number(C.i32((C.field(ttmp,"trap","ttyp").value))==C.SPIKED_PIT))))&&C.i32(C.field(C.field(ttmp,"trap","vl").address,"vlaunchinfo","v_conjoined").value)))) {
                (C.field(C.field(ttmp,"trap","vl").address,"vlaunchinfo","v_conjoined").value=C.u8(flip_encoded_dir_bits(flp,C.i32(C.field(C.field(ttmp,"trap","vl").address,"vlaunchinfo","v_conjoined").value))));
            }
        }
    }
    /* objects */
    for((otmp=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objlist").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) {
        if(Number(!((Number(!!(Number(!!(Number(!!(Number(C.i32((C.field(otmp,"obj","ox").value))>=C.i32(C.cell(minxAddress,"short").value))&&Number(C.i32((C.field(otmp,"obj","ox").value))<=C.i32(C.cell(maxxAddress,"short").value))))&&Number(C.i32((C.field(otmp,"obj","oy").value))>=C.i32(C.cell(minyAddress,"short").value))))&&Number(C.i32((C.field(otmp,"obj","oy").value))<=C.i32(C.cell(maxyAddress,"short").value)))))))) continue;
        if(C.i32((flp&1))) (C.field(otmp,"obj","oy").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field(otmp,"obj","oy").value)))))+C.i32(C.cell(minyAddress,"short").value))))));
        if(C.i32((flp&2))) (C.field(otmp,"obj","ox").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field(otmp,"obj","ox").value)))))+C.i32(C.cell(minxAddress,"short").value))))));
    }
    /* buried objects */
    for((otmp=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","buriedobjlist").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) {
        if(Number(!((Number(!!(Number(!!(Number(!!(Number(C.i32((C.field(otmp,"obj","ox").value))>=C.i32(C.cell(minxAddress,"short").value))&&Number(C.i32((C.field(otmp,"obj","ox").value))<=C.i32(C.cell(maxxAddress,"short").value))))&&Number(C.i32((C.field(otmp,"obj","oy").value))>=C.i32(C.cell(minyAddress,"short").value))))&&Number(C.i32((C.field(otmp,"obj","oy").value))<=C.i32(C.cell(maxyAddress,"short").value)))))))) continue;
        if(C.i32((flp&1))) (C.field(otmp,"obj","oy").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field(otmp,"obj","oy").value)))))+C.i32(C.cell(minyAddress,"short").value))))));
        if(C.i32((flp&2))) (C.field(otmp,"obj","ox").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field(otmp,"obj","ox").value)))))+C.i32(C.cell(minxAddress,"short").value))))));
    }
    /* monsters */
    for((mtmp=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value);mtmp;(mtmp=C.field(mtmp,"monst","nmon").value)) {
        if(C.field(mtmp,"monst","isgd").value) {
            if(extras) flip_vault_guard(flp,mtmp,C.cell(minxAddress,"short").value,C.cell(minyAddress,"short").value,C.cell(maxxAddress,"short").value,C.cell(maxyAddress,"short").value);
            /* flip mtmp->mextra->egd */
            if(Number(C.i32(C.field(mtmp,"monst","mx").value)==0)) continue;
            /* not on map so don't flip guard->mx,my */
        }
        /* skip the occasional earth elemental outside the flip area */
        if(Number(!((Number(!!(Number(!!(Number(!!(Number(C.i32((C.field(mtmp,"monst","mx").value))>=C.i32(C.cell(minxAddress,"short").value))&&Number(C.i32((C.field(mtmp,"monst","mx").value))<=C.i32(C.cell(maxxAddress,"short").value))))&&Number(C.i32((C.field(mtmp,"monst","my").value))>=C.i32(C.cell(minyAddress,"short").value))))&&Number(C.i32((C.field(mtmp,"monst","my").value))<=C.i32(C.cell(maxyAddress,"short").value)))))))) continue;
        if(C.i32((flp&1))) (C.field(mtmp,"monst","my").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field(mtmp,"monst","my").value)))))+C.i32(C.cell(minyAddress,"short").value))))));
        if(C.i32((flp&2))) (C.field(mtmp,"monst","mx").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field(mtmp,"monst","mx").value)))))+C.i32(C.cell(minxAddress,"short").value))))));
        do {
            if(Number(!!(C.i32(C.field(C.field(mtmp,"monst","mgoal").address,"nhcoord","x").value)&&(Number(!!(Number(!!(Number(!!(Number(C.i32((C.field(C.field(mtmp,"monst","mgoal").address,"nhcoord","x").value))>=C.i32(C.cell(minxAddress,"short").value))&&Number(C.i32((C.field(C.field(mtmp,"monst","mgoal").address,"nhcoord","x").value))<=C.i32(C.cell(maxxAddress,"short").value))))&&Number(C.i32((C.field(C.field(mtmp,"monst","mgoal").address,"nhcoord","y").value))>=C.i32(C.cell(minyAddress,"short").value))))&&Number(C.i32((C.field(C.field(mtmp,"monst","mgoal").address,"nhcoord","y").value))<=C.i32(C.cell(maxyAddress,"short").value)))))))) {
                if(C.i32((flp&1))) (C.field(C.field(mtmp,"monst","mgoal").address,"nhcoord","y").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field(C.field(mtmp,"monst","mgoal").address,"nhcoord","y").value)))))+C.i32(C.cell(minyAddress,"short").value))))));
                if(C.i32((flp&2))) (C.field(C.field(mtmp,"monst","mgoal").address,"nhcoord","x").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field(C.field(mtmp,"monst","mgoal").address,"nhcoord","x").value)))))+C.i32(C.cell(minxAddress,"short").value))))));
            }
        } while(0);
        if(C.field(mtmp,"monst","ispriest").value) {
            do {
                if(Number(!!(C.i32(C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","epri").value),"epri","shrpos").address,"nhcoord","x").value)&&(Number(!!(Number(!!(Number(!!(Number(C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","epri").value),"epri","shrpos").address,"nhcoord","x").value))>=C.i32(C.cell(minxAddress,"short").value))&&Number(C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","epri").value),"epri","shrpos").address,"nhcoord","x").value))<=C.i32(C.cell(maxxAddress,"short").value))))&&Number(C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","epri").value),"epri","shrpos").address,"nhcoord","y").value))>=C.i32(C.cell(minyAddress,"short").value))))&&Number(C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","epri").value),"epri","shrpos").address,"nhcoord","y").value))<=C.i32(C.cell(maxyAddress,"short").value)))))))) {
                    if(C.i32((flp&1))) (C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","epri").value),"epri","shrpos").address,"nhcoord","y").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","epri").value),"epri","shrpos").address,"nhcoord","y").value)))))+C.i32(C.cell(minyAddress,"short").value))))));
                    if(C.i32((flp&2))) (C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","epri").value),"epri","shrpos").address,"nhcoord","x").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","epri").value),"epri","shrpos").address,"nhcoord","x").value)))))+C.i32(C.cell(minxAddress,"short").value))))));
                }
            } while(0);
        } else if(C.field(mtmp,"monst","isshk").value) {
            do {
                if(Number(!!(C.i32(C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shk").address,"nhcoord","x").value)&&(Number(!!(Number(!!(Number(!!(Number(C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shk").address,"nhcoord","x").value))>=C.i32(C.cell(minxAddress,"short").value))&&Number(C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shk").address,"nhcoord","x").value))<=C.i32(C.cell(maxxAddress,"short").value))))&&Number(C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shk").address,"nhcoord","y").value))>=C.i32(C.cell(minyAddress,"short").value))))&&Number(C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shk").address,"nhcoord","y").value))<=C.i32(C.cell(maxyAddress,"short").value)))))))) {
                    if(C.i32((flp&1))) (C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shk").address,"nhcoord","y").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shk").address,"nhcoord","y").value)))))+C.i32(C.cell(minyAddress,"short").value))))));
                    if(C.i32((flp&2))) (C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shk").address,"nhcoord","x").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shk").address,"nhcoord","x").value)))))+C.i32(C.cell(minxAddress,"short").value))))));
                }
            } while(0);
            /* shk's preferred spot */
            do {
                if(Number(!!(C.i32(C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shd").address,"nhcoord","x").value)&&(Number(!!(Number(!!(Number(!!(Number(C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shd").address,"nhcoord","x").value))>=C.i32(C.cell(minxAddress,"short").value))&&Number(C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shd").address,"nhcoord","x").value))<=C.i32(C.cell(maxxAddress,"short").value))))&&Number(C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shd").address,"nhcoord","y").value))>=C.i32(C.cell(minyAddress,"short").value))))&&Number(C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shd").address,"nhcoord","y").value))<=C.i32(C.cell(maxyAddress,"short").value)))))))) {
                    if(C.i32((flp&1))) (C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shd").address,"nhcoord","y").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shd").address,"nhcoord","y").value)))))+C.i32(C.cell(minyAddress,"short").value))))));
                    if(C.i32((flp&2))) (C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shd").address,"nhcoord","x").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shd").address,"nhcoord","x").value)))))+C.i32(C.cell(minxAddress,"short").value))))));
                }
            } while(0);
            /* shop door */
        } else if(C.field(mtmp,"monst","wormno").value) {
            if(C.i32((flp&1))) C.flip_worm_segs_vertical(mtmp,C.i32(C.cell(minyAddress,"short").value),C.i32(C.cell(maxyAddress,"short").value));
            if(C.i32((flp&2))) C.flip_worm_segs_horizontal(mtmp,C.i32(C.cell(minxAddress,"short").value),C.i32(C.cell(maxxAddress,"short").value));
        }
        /* not useful unless tracking also gets flipped */
    }
    if(extras) {
        /* #wizfliplevel rather than level creation */
        for((mtmp=C.field(C.gm,"instance_globals_m","migrating_mons").value);mtmp;(mtmp=C.field(mtmp,"monst","nmon").value)) {
            if(Number(!!(C.i32(C.field(mtmp,"monst","isgd").value)&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","egd").value),"egd","gdlevel").address))))) {
                flip_vault_guard(flp,mtmp,C.cell(minxAddress,"short").value,C.cell(minyAddress,"short").value,C.cell(maxxAddress,"short").value,C.cell(maxyAddress,"short").value);
                /* egd */
            } else if(Number(!!(C.i32(C.field(mtmp,"monst","ispriest").value)&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","epri").value),"epri","shrlevel").address))))) {
                do {
                    if(Number(!!(C.i32(C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","epri").value),"epri","shrpos").address,"nhcoord","x").value)&&(Number(!!(Number(!!(Number(!!(Number(C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","epri").value),"epri","shrpos").address,"nhcoord","x").value))>=C.i32(C.cell(minxAddress,"short").value))&&Number(C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","epri").value),"epri","shrpos").address,"nhcoord","x").value))<=C.i32(C.cell(maxxAddress,"short").value))))&&Number(C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","epri").value),"epri","shrpos").address,"nhcoord","y").value))>=C.i32(C.cell(minyAddress,"short").value))))&&Number(C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","epri").value),"epri","shrpos").address,"nhcoord","y").value))<=C.i32(C.cell(maxyAddress,"short").value)))))))) {
                        if(C.i32((flp&1))) (C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","epri").value),"epri","shrpos").address,"nhcoord","y").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","epri").value),"epri","shrpos").address,"nhcoord","y").value)))))+C.i32(C.cell(minyAddress,"short").value))))));
                        if(C.i32((flp&2))) (C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","epri").value),"epri","shrpos").address,"nhcoord","x").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","epri").value),"epri","shrpos").address,"nhcoord","x").value)))))+C.i32(C.cell(minxAddress,"short").value))))));
                    }
                } while(0);
                /* priest's altar */
            } else if(Number(!!(C.i32(C.field(mtmp,"monst","isshk").value)&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shoplevel").address))))) {
                do {
                    if(Number(!!(C.i32(C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shk").address,"nhcoord","x").value)&&(Number(!!(Number(!!(Number(!!(Number(C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shk").address,"nhcoord","x").value))>=C.i32(C.cell(minxAddress,"short").value))&&Number(C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shk").address,"nhcoord","x").value))<=C.i32(C.cell(maxxAddress,"short").value))))&&Number(C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shk").address,"nhcoord","y").value))>=C.i32(C.cell(minyAddress,"short").value))))&&Number(C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shk").address,"nhcoord","y").value))<=C.i32(C.cell(maxyAddress,"short").value)))))))) {
                        if(C.i32((flp&1))) (C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shk").address,"nhcoord","y").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shk").address,"nhcoord","y").value)))))+C.i32(C.cell(minyAddress,"short").value))))));
                        if(C.i32((flp&2))) (C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shk").address,"nhcoord","x").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shk").address,"nhcoord","x").value)))))+C.i32(C.cell(minxAddress,"short").value))))));
                    }
                } while(0);
                /* shk's preferred spot */
                do {
                    if(Number(!!(C.i32(C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shd").address,"nhcoord","x").value)&&(Number(!!(Number(!!(Number(!!(Number(C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shd").address,"nhcoord","x").value))>=C.i32(C.cell(minxAddress,"short").value))&&Number(C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shd").address,"nhcoord","x").value))<=C.i32(C.cell(maxxAddress,"short").value))))&&Number(C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shd").address,"nhcoord","y").value))>=C.i32(C.cell(minyAddress,"short").value))))&&Number(C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shd").address,"nhcoord","y").value))<=C.i32(C.cell(maxyAddress,"short").value)))))))) {
                        if(C.i32((flp&1))) (C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shd").address,"nhcoord","y").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shd").address,"nhcoord","y").value)))))+C.i32(C.cell(minyAddress,"short").value))))));
                        if(C.i32((flp&2))) (C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shd").address,"nhcoord","x").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shd").address,"nhcoord","x").value)))))+C.i32(C.cell(minxAddress,"short").value))))));
                    }
                } while(0);
                /* shop door */
            }
        }
    }
    /* engravings */
    for((etmp=C.global("head_engr").value);etmp;(etmp=C.field(etmp,"engr","nxt_engr").value)) {
        if(C.i32((flp&1))) (C.field(etmp,"engr","engr_y").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field(etmp,"engr","engr_y").value)))))+C.i32(C.cell(minyAddress,"short").value))))));
        if(C.i32((flp&2))) (C.field(etmp,"engr","engr_x").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field(etmp,"engr","engr_x").value)))))+C.i32(C.cell(minxAddress,"short").value))))));
    }
    /* level (teleport) regions */
    for((i=0);Number(i<C.field(C.gn,"instance_globals_n","num_lregions").value);(()=>{const old=i;const next=C.i32((old+1));i=next;return old;})()) {
        if(C.i32((flp&1))) {
            (C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","inarea").address,"sp_lev_lregion_inarea","y1").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","inarea").address,"sp_lev_lregion_inarea","y1").value)))))+C.i32(C.cell(minyAddress,"short").value))))));
            (C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","inarea").address,"sp_lev_lregion_inarea","y2").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","inarea").address,"sp_lev_lregion_inarea","y2").value)))))+C.i32(C.cell(minyAddress,"short").value))))));
            if(Number(C.i32(C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","inarea").address,"sp_lev_lregion_inarea","y1").value)>C.i32(C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","inarea").address,"sp_lev_lregion_inarea","y2").value))) {
                (itmp=C.i32(C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","inarea").address,"sp_lev_lregion_inarea","y1").value));
                (C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","inarea").address,"sp_lev_lregion_inarea","y1").value=C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","inarea").address,"sp_lev_lregion_inarea","y2").value);
                (C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","inarea").address,"sp_lev_lregion_inarea","y2").value=C.i16(itmp));
            }
            (C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","delarea").address,"sp_lev_lregion_delarea","y1").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","delarea").address,"sp_lev_lregion_delarea","y1").value)))))+C.i32(C.cell(minyAddress,"short").value))))));
            (C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","delarea").address,"sp_lev_lregion_delarea","y2").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","delarea").address,"sp_lev_lregion_delarea","y2").value)))))+C.i32(C.cell(minyAddress,"short").value))))));
            if(Number(C.i32(C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","delarea").address,"sp_lev_lregion_delarea","y1").value)>C.i32(C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","delarea").address,"sp_lev_lregion_delarea","y2").value))) {
                (itmp=C.i32(C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","delarea").address,"sp_lev_lregion_delarea","y1").value));
                (C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","delarea").address,"sp_lev_lregion_delarea","y1").value=C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","delarea").address,"sp_lev_lregion_delarea","y2").value);
                (C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","delarea").address,"sp_lev_lregion_delarea","y2").value=C.i16(itmp));
            }
        }
        if(C.i32((flp&2))) {
            (C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","inarea").address,"sp_lev_lregion_inarea","x1").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","inarea").address,"sp_lev_lregion_inarea","x1").value)))))+C.i32(C.cell(minxAddress,"short").value))))));
            (C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","inarea").address,"sp_lev_lregion_inarea","x2").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","inarea").address,"sp_lev_lregion_inarea","x2").value)))))+C.i32(C.cell(minxAddress,"short").value))))));
            if(Number(C.i32(C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","inarea").address,"sp_lev_lregion_inarea","x1").value)>C.i32(C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","inarea").address,"sp_lev_lregion_inarea","x2").value))) {
                (itmp=C.i32(C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","inarea").address,"sp_lev_lregion_inarea","x1").value));
                (C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","inarea").address,"sp_lev_lregion_inarea","x1").value=C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","inarea").address,"sp_lev_lregion_inarea","x2").value);
                (C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","inarea").address,"sp_lev_lregion_inarea","x2").value=C.i16(itmp));
            }
            (C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","delarea").address,"sp_lev_lregion_delarea","x1").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","delarea").address,"sp_lev_lregion_delarea","x1").value)))))+C.i32(C.cell(minxAddress,"short").value))))));
            (C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","delarea").address,"sp_lev_lregion_delarea","x2").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","delarea").address,"sp_lev_lregion_delarea","x2").value)))))+C.i32(C.cell(minxAddress,"short").value))))));
            if(Number(C.i32(C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","delarea").address,"sp_lev_lregion_delarea","x1").value)>C.i32(C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","delarea").address,"sp_lev_lregion_delarea","x2").value))) {
                (itmp=C.i32(C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","delarea").address,"sp_lev_lregion_delarea","x1").value));
                (C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","delarea").address,"sp_lev_lregion_delarea","x1").value=C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","delarea").address,"sp_lev_lregion_delarea","x2").value);
                (C.field(C.field((C.field(C.gl,"instance_globals_l","lregions").value+Number(i)*C.sizes["lev_region"]),"lev_region","delarea").address,"sp_lev_lregion_delarea","x2").value=C.i16(itmp));
            }
        }
    }
    /* regions (poison clouds, etc) */
    for((i=0);Number(i<C.field(C.svn,"instance_globals_saved_n","n_regions").value);(()=>{const old=i;const next=C.i32((old+1));i=next;return old;})()) {
        let j; let tmp1; let tmp2;
        if(C.i32((flp&1))) {
            (tmp1=(C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field(C.field(C.cell((C.field(C.gr,"instance_globals_r","regions").value+Number(i)*8),"NhRegion *").value,"NhRegion","bounding_box").address,"nhrect","ly").value)))))+C.i32(C.cell(minyAddress,"short").value)))));
            (tmp2=(C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field(C.field(C.cell((C.field(C.gr,"instance_globals_r","regions").value+Number(i)*8),"NhRegion *").value,"NhRegion","bounding_box").address,"nhrect","hy").value)))))+C.i32(C.cell(minyAddress,"short").value)))));
            (C.field(C.field(C.cell((C.field(C.gr,"instance_globals_r","regions").value+Number(i)*8),"NhRegion *").value,"NhRegion","bounding_box").address,"nhrect","ly").value=C.i16(((Number((tmp1)<(tmp2))?(tmp1):(tmp2)))));
            (C.field(C.field(C.cell((C.field(C.gr,"instance_globals_r","regions").value+Number(i)*8),"NhRegion *").value,"NhRegion","bounding_box").address,"nhrect","hy").value=C.i16(((Number((tmp1)>(tmp2))?(tmp1):(tmp2)))));
            for((j=0);Number(j<C.i32(C.field(C.cell((C.field(C.gr,"instance_globals_r","regions").value+Number(i)*8),"NhRegion *").value,"NhRegion","nrects").value));(()=>{const old=j;const next=C.i32((old+1));j=next;return old;})()) {
                (tmp1=(C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field((C.field(C.cell((C.field(C.gr,"instance_globals_r","regions").value+Number(i)*8),"NhRegion *").value,"NhRegion","rects").value+Number(j)*C.sizes["struct nhrect"]),"nhrect","ly").value)))))+C.i32(C.cell(minyAddress,"short").value)))));
                (tmp2=(C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field((C.field(C.cell((C.field(C.gr,"instance_globals_r","regions").value+Number(i)*8),"NhRegion *").value,"NhRegion","rects").value+Number(j)*C.sizes["struct nhrect"]),"nhrect","hy").value)))))+C.i32(C.cell(minyAddress,"short").value)))));
                (C.field((C.field(C.cell((C.field(C.gr,"instance_globals_r","regions").value+Number(i)*8),"NhRegion *").value,"NhRegion","rects").value+Number(j)*C.sizes["struct nhrect"]),"nhrect","ly").value=C.i16(((Number((tmp1)<(tmp2))?(tmp1):(tmp2)))));
                (C.field((C.field(C.cell((C.field(C.gr,"instance_globals_r","regions").value+Number(i)*8),"NhRegion *").value,"NhRegion","rects").value+Number(j)*C.sizes["struct nhrect"]),"nhrect","hy").value=C.i16(((Number((tmp1)>(tmp2))?(tmp1):(tmp2)))));
            }
        }
        if(C.i32((flp&2))) {
            (tmp1=(C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field(C.field(C.cell((C.field(C.gr,"instance_globals_r","regions").value+Number(i)*8),"NhRegion *").value,"NhRegion","bounding_box").address,"nhrect","lx").value)))))+C.i32(C.cell(minxAddress,"short").value)))));
            (tmp2=(C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field(C.field(C.cell((C.field(C.gr,"instance_globals_r","regions").value+Number(i)*8),"NhRegion *").value,"NhRegion","bounding_box").address,"nhrect","hx").value)))))+C.i32(C.cell(minxAddress,"short").value)))));
            (C.field(C.field(C.cell((C.field(C.gr,"instance_globals_r","regions").value+Number(i)*8),"NhRegion *").value,"NhRegion","bounding_box").address,"nhrect","lx").value=C.i16(((Number((tmp1)<(tmp2))?(tmp1):(tmp2)))));
            (C.field(C.field(C.cell((C.field(C.gr,"instance_globals_r","regions").value+Number(i)*8),"NhRegion *").value,"NhRegion","bounding_box").address,"nhrect","hx").value=C.i16(((Number((tmp1)>(tmp2))?(tmp1):(tmp2)))));
            for((j=0);Number(j<C.i32(C.field(C.cell((C.field(C.gr,"instance_globals_r","regions").value+Number(i)*8),"NhRegion *").value,"NhRegion","nrects").value));(()=>{const old=j;const next=C.i32((old+1));j=next;return old;})()) {
                (tmp1=(C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field((C.field(C.cell((C.field(C.gr,"instance_globals_r","regions").value+Number(i)*8),"NhRegion *").value,"NhRegion","rects").value+Number(j)*C.sizes["struct nhrect"]),"nhrect","lx").value)))))+C.i32(C.cell(minxAddress,"short").value)))));
                (tmp2=(C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field((C.field(C.cell((C.field(C.gr,"instance_globals_r","regions").value+Number(i)*8),"NhRegion *").value,"NhRegion","rects").value+Number(j)*C.sizes["struct nhrect"]),"nhrect","hx").value)))))+C.i32(C.cell(minxAddress,"short").value)))));
                (C.field((C.field(C.cell((C.field(C.gr,"instance_globals_r","regions").value+Number(i)*8),"NhRegion *").value,"NhRegion","rects").value+Number(j)*C.sizes["struct nhrect"]),"nhrect","lx").value=C.i16(((Number((tmp1)<(tmp2))?(tmp1):(tmp2)))));
                (C.field((C.field(C.cell((C.field(C.gr,"instance_globals_r","regions").value+Number(i)*8),"NhRegion *").value,"NhRegion","rects").value+Number(j)*C.sizes["struct nhrect"]),"nhrect","hx").value=C.i16(((Number((tmp1)>(tmp2))?(tmp1):(tmp2)))));
            }
        }
    }
    /* rooms */
    for((sroom=(C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(0)*C.sizes["struct mkroom"]));;(()=>{const old=sroom;const next=C.ptr((old+Number(C.sizes["struct mkroom"])));sroom=next;return old;})()) {
        if(Number(C.i32(C.field(sroom,"mkroom","hx").value)<0)) break;
        if(C.i32((flp&1))) {
            (C.field(sroom,"mkroom","ly").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field(sroom,"mkroom","ly").value)))))+C.i32(C.cell(minyAddress,"short").value))))));
            (C.field(sroom,"mkroom","hy").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field(sroom,"mkroom","hy").value)))))+C.i32(C.cell(minyAddress,"short").value))))));
            if(Number(C.i32(C.field(sroom,"mkroom","ly").value)>C.i32(C.field(sroom,"mkroom","hy").value))) {
                (itmp=C.i32(C.field(sroom,"mkroom","ly").value));
                (C.field(sroom,"mkroom","ly").value=C.field(sroom,"mkroom","hy").value);
                (C.field(sroom,"mkroom","hy").value=C.i16(itmp));
            }
        }
        if(C.i32((flp&2))) {
            (C.field(sroom,"mkroom","lx").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field(sroom,"mkroom","lx").value)))))+C.i32(C.cell(minxAddress,"short").value))))));
            (C.field(sroom,"mkroom","hx").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field(sroom,"mkroom","hx").value)))))+C.i32(C.cell(minxAddress,"short").value))))));
            if(Number(C.i32(C.field(sroom,"mkroom","lx").value)>C.i32(C.field(sroom,"mkroom","hx").value))) {
                (itmp=C.i32(C.field(sroom,"mkroom","lx").value));
                (C.field(sroom,"mkroom","lx").value=C.field(sroom,"mkroom","hx").value);
                (C.field(sroom,"mkroom","hx").value=C.i16(itmp));
            }
        }
        if(C.field(sroom,"mkroom","nsubrooms").value) for((i=0);Number(i<C.i32(C.field(sroom,"mkroom","nsubrooms").value));(()=>{const old=i;const next=C.i32((old+1));i=next;return old;})()) {
            let rroom=C.cell((C.field(sroom,"mkroom","sbrooms").address+Number(i)*8),"struct mkroom *").value;
            if(C.i32((flp&1))) {
                (C.field(rroom,"mkroom","ly").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field(rroom,"mkroom","ly").value)))))+C.i32(C.cell(minyAddress,"short").value))))));
                (C.field(rroom,"mkroom","hy").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field(rroom,"mkroom","hy").value)))))+C.i32(C.cell(minyAddress,"short").value))))));
                if(Number(C.i32(C.field(rroom,"mkroom","ly").value)>C.i32(C.field(rroom,"mkroom","hy").value))) {
                    (itmp=C.i32(C.field(rroom,"mkroom","ly").value));
                    (C.field(rroom,"mkroom","ly").value=C.field(rroom,"mkroom","hy").value);
                    (C.field(rroom,"mkroom","hy").value=C.i16(itmp));
                }
            }
            if(C.i32((flp&2))) {
                (C.field(rroom,"mkroom","lx").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field(rroom,"mkroom","lx").value)))))+C.i32(C.cell(minxAddress,"short").value))))));
                (C.field(rroom,"mkroom","hx").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field(rroom,"mkroom","hx").value)))))+C.i32(C.cell(minxAddress,"short").value))))));
                if(Number(C.i32(C.field(rroom,"mkroom","lx").value)>C.i32(C.field(rroom,"mkroom","hx").value))) {
                    (itmp=C.i32(C.field(rroom,"mkroom","lx").value));
                    (C.field(rroom,"mkroom","lx").value=C.field(rroom,"mkroom","hx").value);
                    (C.field(rroom,"mkroom","hx").value=C.i16(itmp));
                }
            }
        }
    }
    /* doors */
    for((i=0);Number(i<C.field(C.gd,"instance_globals_d","doorindex").value);(()=>{const old=i;const next=C.i32((old+1));i=next;return old;})()) {
        do {
            if(Number(!!(C.i32(C.field((C.field(C.svd,"instance_globals_saved_d","doors").value+Number(i)*C.sizes["struct nhcoord"]),"nhcoord","x").value)&&(Number(!!(Number(!!(Number(!!(Number(C.i32((C.field((C.field(C.svd,"instance_globals_saved_d","doors").value+Number(i)*C.sizes["struct nhcoord"]),"nhcoord","x").value))>=C.i32(C.cell(minxAddress,"short").value))&&Number(C.i32((C.field((C.field(C.svd,"instance_globals_saved_d","doors").value+Number(i)*C.sizes["struct nhcoord"]),"nhcoord","x").value))<=C.i32(C.cell(maxxAddress,"short").value))))&&Number(C.i32((C.field((C.field(C.svd,"instance_globals_saved_d","doors").value+Number(i)*C.sizes["struct nhcoord"]),"nhcoord","y").value))>=C.i32(C.cell(minyAddress,"short").value))))&&Number(C.i32((C.field((C.field(C.svd,"instance_globals_saved_d","doors").value+Number(i)*C.sizes["struct nhcoord"]),"nhcoord","y").value))<=C.i32(C.cell(maxyAddress,"short").value)))))))) {
                if(C.i32((flp&1))) (C.field((C.field(C.svd,"instance_globals_saved_d","doors").value+Number(i)*C.sizes["struct nhcoord"]),"nhcoord","y").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field((C.field(C.svd,"instance_globals_saved_d","doors").value+Number(i)*C.sizes["struct nhcoord"]),"nhcoord","y").value)))))+C.i32(C.cell(minyAddress,"short").value))))));
                if(C.i32((flp&2))) (C.field((C.field(C.svd,"instance_globals_saved_d","doors").value+Number(i)*C.sizes["struct nhcoord"]),"nhcoord","x").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field((C.field(C.svd,"instance_globals_saved_d","doors").value+Number(i)*C.sizes["struct nhcoord"]),"nhcoord","x").value)))))+C.i32(C.cell(minxAddress,"short").value))))));
            }
        } while(0);
    }
    /* the map */
    if(C.i32((flp&1))) {
        for((x=C.i32(C.cell(minxAddress,"short").value));Number(x<=C.i32(C.cell(maxxAddress,"short").value));(()=>{const old=x;const next=C.i32((old+1));x=next;return old;})()) for((y=C.i32(C.cell(minyAddress,"short").value));Number(y<(C.i32((C.i32(C.cell(minyAddress,"short").value)+(C.i32(Math.trunc(((C.i32((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32(C.cell(minyAddress,"short").value)))+1)))/2))))))));(()=>{const old=y;const next=C.i32((old+1));y=next;return old;})()) {
            let ny=(C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-(y))))+C.i32(C.cell(minyAddress,"short").value))));
            flip_dbridge_vertical(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]));
            flip_dbridge_vertical(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(ny)*C.sizes["struct rm"]));
            C.copyRecord(trm,((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),C.sizes["struct rm"]);
            C.copyRecord(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(ny)*C.sizes["struct rm"]),C.sizes["struct rm"]);
            C.copyRecord(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(ny)*C.sizes["struct rm"]),trm,C.sizes["struct rm"]);
            (otmp=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8),"struct obj *").value);
            (C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8),"struct obj *").value=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(ny)*8),"struct obj *").value);
            (C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(ny)*8),"struct obj *").value=otmp);
            (mtmp=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value);
            (C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(ny)*8),"struct monst *").value);
            (C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(ny)*8),"struct monst *").value=mtmp);
        }

    }
    if(C.i32((flp&2))) {
        for((x=C.i32(C.cell(minxAddress,"short").value));Number(x<(C.i32((C.i32(C.cell(minxAddress,"short").value)+(C.i32(Math.trunc(((C.i32((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32(C.cell(minxAddress,"short").value)))+1)))/2))))))));(()=>{const old=x;const next=C.i32((old+1));x=next;return old;})()) for((y=C.i32(C.cell(minyAddress,"short").value));Number(y<=C.i32(C.cell(maxyAddress,"short").value));(()=>{const old=y;const next=C.i32((old+1));y=next;return old;})()) {
            let nx=(C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-(x))))+C.i32(C.cell(minxAddress,"short").value))));
            flip_dbridge_horizontal(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]));
            flip_dbridge_horizontal(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(nx)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]));
            C.copyRecord(trm,((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),C.sizes["struct rm"]);
            C.copyRecord(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(nx)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),C.sizes["struct rm"]);
            C.copyRecord(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(nx)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),trm,C.sizes["struct rm"]);
            (otmp=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8),"struct obj *").value);
            (C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8),"struct obj *").value=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(nx)*(8*21))+Number(y)*8),"struct obj *").value);
            (C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(nx)*(8*21))+Number(y)*8),"struct obj *").value=otmp);
            (mtmp=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value);
            (C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(nx)*(8*21))+Number(y)*8),"struct monst *").value);
            (C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(nx)*(8*21))+Number(y)*8),"struct monst *").value=mtmp);
        }

    }
    /* timed effects */
    for((timer=C.field(C.gt,"instance_globals_t","timer_base").value);timer;(timer=C.field(timer,"fe","next").value)) {
        if(Number(C.i32(C.field(timer,"fe","func_index").value)==C.MELT_ICE_AWAY)) {
            let ty=C.i64((C.field(C.field(timer,"fe","arg").address,"any","a_long").value&C.i64(65535)));
            let tx=C.i64(((C.i64((C.field(C.field(timer,"fe","arg").address,"any","a_long").value>>BigInt(16))))&C.i64(65535)));
            if(C.i32((flp&1))) (ty=(C.i64(((C.i64((C.i64(C.cell(maxyAddress,"short").value)-(ty))))+C.i64(C.cell(minyAddress,"short").value)))));
            if(C.i32((flp&2))) (tx=(C.i64(((C.i64((C.i64(C.cell(maxxAddress,"short").value)-(tx))))+C.i64(C.cell(minxAddress,"short").value)))));
            (C.field(C.field(timer,"fe","arg").address,"any","a_long").value=(C.i64(((C.i64((tx<<BigInt(16))))|ty))));
        }
    }
    /* exclusion zones */
    for((ez=C.field(C.sve,"instance_globals_saved_e","exclusion_zones").value);ez;(ez=C.field(ez,"exclusion_zone","next").value)) {
        if(C.i32((flp&1))) {
            (C.field(ez,"exclusion_zone","ly").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field(ez,"exclusion_zone","ly").value)))))+C.i32(C.cell(minyAddress,"short").value))))));
            (C.field(ez,"exclusion_zone","hy").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field(ez,"exclusion_zone","hy").value)))))+C.i32(C.cell(minyAddress,"short").value))))));
            if(Number(C.i32(C.field(ez,"exclusion_zone","ly").value)>C.i32(C.field(ez,"exclusion_zone","hy").value))) {
                (itmp=C.i32(C.field(ez,"exclusion_zone","ly").value));
                (C.field(ez,"exclusion_zone","ly").value=C.field(ez,"exclusion_zone","hy").value);
                (C.field(ez,"exclusion_zone","hy").value=C.i16(itmp));
            }
        }
        if(C.i32((flp&2))) {
            (C.field(ez,"exclusion_zone","lx").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field(ez,"exclusion_zone","lx").value)))))+C.i32(C.cell(minxAddress,"short").value))))));
            (C.field(ez,"exclusion_zone","hx").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field(ez,"exclusion_zone","hx").value)))))+C.i32(C.cell(minxAddress,"short").value))))));
            if(Number(C.i32(C.field(ez,"exclusion_zone","lx").value)>C.i32(C.field(ez,"exclusion_zone","hx").value))) {
                (itmp=C.i32(C.field(ez,"exclusion_zone","lx").value));
                (C.field(ez,"exclusion_zone","lx").value=C.field(ez,"exclusion_zone","hx").value);
                (C.field(ez,"exclusion_zone","hx").value=C.i16(itmp));
            }
        }
    }
    if(extras) {
        /* for #wizfliplevel rather than during level creation */
        /* flip hero location only if inside the flippable area */
        if((Number(!!(Number(!!(Number(!!(Number(C.i32((C.field(C.u,"you","ux").value))>=C.i32(C.cell(minxAddress,"short").value))&&Number(C.i32((C.field(C.u,"you","ux").value))<=C.i32(C.cell(maxxAddress,"short").value))))&&Number(C.i32((C.field(C.u,"you","uy").value))>=C.i32(C.cell(minyAddress,"short").value))))&&Number(C.i32((C.field(C.u,"you","uy").value))<=C.i32(C.cell(maxyAddress,"short").value)))))) {
            if(C.i32((flp&1))) (C.field(C.u,"you","uy").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field(C.u,"you","uy").value)))))+C.i32(C.cell(minyAddress,"short").value))))));
            if(C.i32((flp&2))) (C.field(C.u,"you","ux").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field(C.u,"you","ux").value)))))+C.i32(C.cell(minxAddress,"short").value))))));
            /* we could flip <ux0,uy0> too if it's inside the flip area,
               but have to resort to this if outside, so just do this */
            ((C.field(C.u,"you","ux0").value=C.field(C.u,"you","ux").value),(C.field(C.u,"you","uy0").value=C.field(C.u,"you","uy").value));
        }
        if(Number(!!(C.i32(ball_active)&&Number(!(ball_fliparea))))) C.placebc();
        do {
            if(Number(!!(C.i32(C.field(C.field(C.iflags,"instance_flags","travelcc").address,"nhcoord","x").value)&&(Number(!!(Number(!!(Number(!!(Number(C.i32((C.field(C.field(C.iflags,"instance_flags","travelcc").address,"nhcoord","x").value))>=C.i32(C.cell(minxAddress,"short").value))&&Number(C.i32((C.field(C.field(C.iflags,"instance_flags","travelcc").address,"nhcoord","x").value))<=C.i32(C.cell(maxxAddress,"short").value))))&&Number(C.i32((C.field(C.field(C.iflags,"instance_flags","travelcc").address,"nhcoord","y").value))>=C.i32(C.cell(minyAddress,"short").value))))&&Number(C.i32((C.field(C.field(C.iflags,"instance_flags","travelcc").address,"nhcoord","y").value))<=C.i32(C.cell(maxyAddress,"short").value)))))))) {
                if(C.i32((flp&1))) (C.field(C.field(C.iflags,"instance_flags","travelcc").address,"nhcoord","y").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field(C.field(C.iflags,"instance_flags","travelcc").address,"nhcoord","y").value)))))+C.i32(C.cell(minyAddress,"short").value))))));
                if(C.i32((flp&2))) (C.field(C.field(C.iflags,"instance_flags","travelcc").address,"nhcoord","x").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field(C.field(C.iflags,"instance_flags","travelcc").address,"nhcoord","x").value)))))+C.i32(C.cell(minxAddress,"short").value))))));
            }
        } while(0);
        do {
            if(Number(!!(C.i32(C.field(C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","digging").address,"dig_info","pos").address,"nhcoord","x").value)&&(Number(!!(Number(!!(Number(!!(Number(C.i32((C.field(C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","digging").address,"dig_info","pos").address,"nhcoord","x").value))>=C.i32(C.cell(minxAddress,"short").value))&&Number(C.i32((C.field(C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","digging").address,"dig_info","pos").address,"nhcoord","x").value))<=C.i32(C.cell(maxxAddress,"short").value))))&&Number(C.i32((C.field(C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","digging").address,"dig_info","pos").address,"nhcoord","y").value))>=C.i32(C.cell(minyAddress,"short").value))))&&Number(C.i32((C.field(C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","digging").address,"dig_info","pos").address,"nhcoord","y").value))<=C.i32(C.cell(maxyAddress,"short").value)))))))) {
                if(C.i32((flp&1))) (C.field(C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","digging").address,"dig_info","pos").address,"nhcoord","y").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxyAddress,"short").value)-C.i32((C.field(C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","digging").address,"dig_info","pos").address,"nhcoord","y").value)))))+C.i32(C.cell(minyAddress,"short").value))))));
                if(C.i32((flp&2))) (C.field(C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","digging").address,"dig_info","pos").address,"nhcoord","x").value=C.i16((C.i32(((C.i32((C.i32(C.cell(maxxAddress,"short").value)-C.i32((C.field(C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","digging").address,"dig_info","pos").address,"nhcoord","x").value)))))+C.i32(C.cell(minxAddress,"short").value))))));
            }
        } while(0);
    }
    C.fix_wall_spines(C.i16(1),C.i16(0),C.i16(C.i32((80-1))),C.i16(C.i32((21-1))));
    if(Number(!!(C.i32(extras)&&flp))) {
        C.set_wall_state();
        /* after wall_spines; flips seenv and wall joins */
        flip_visuals(flp,C.i32(C.cell(minxAddress,"short").value),C.i32(C.cell(minyAddress,"short").value),C.i32(C.cell(maxxAddress,"short").value),C.i32(C.cell(maxyAddress,"short").value));
    }
    C.vision_reset();
    } finally {C.stackRestore(stackFrame); }
}

/* for #wizfliplevel, flip guard's egd data; not needed for level creation */
export function flip_vault_guard(flp,grd,minx,miny,maxx,maxy)
{
    flp=C.i32(flp);
    minx=C.i16(minx);
    miny=C.i16(miny);
    maxx=C.i16(maxx);
    maxy=C.i16(maxy);
    /* 1: transpose vertically, 2: transpose horizontally, 3: both */
    /* the vault guard, has monst->mextra->egd data */
    /* needed by FlipX(), FlipY(), */
    /* and inFlipArea() macros     */
    let i;
    let egd=(C.field(C.field((grd),"monst","mextra").value,"mextra","egd").value);
    if((Number(!!(Number(!!(Number(!!(Number(C.i32((C.field(egd,"egd","gdx").value))>=C.i32(minx))&&Number(C.i32((C.field(egd,"egd","gdx").value))<=C.i32(maxx))))&&Number(C.i32((C.field(egd,"egd","gdy").value))>=C.i32(miny))))&&Number(C.i32((C.field(egd,"egd","gdy").value))<=C.i32(maxy)))))) {
        if(C.i32((flp&1))) (C.field(egd,"egd","gdy").value=C.i16((C.i32(((C.i32((C.i32(maxy)-C.i32((C.field(egd,"egd","gdy").value)))))+C.i32(miny))))));
        if(C.i32((flp&2))) (C.field(egd,"egd","gdx").value=C.i16((C.i32(((C.i32((C.i32(maxx)-C.i32((C.field(egd,"egd","gdx").value)))))+C.i32(minx))))));
    }
    if((Number(!!(Number(!!(Number(!!(Number(C.i32((C.field(egd,"egd","ogx").value))>=C.i32(minx))&&Number(C.i32((C.field(egd,"egd","ogx").value))<=C.i32(maxx))))&&Number(C.i32((C.field(egd,"egd","ogy").value))>=C.i32(miny))))&&Number(C.i32((C.field(egd,"egd","ogy").value))<=C.i32(maxy)))))) {
        if(C.i32((flp&1))) (C.field(egd,"egd","ogy").value=C.i16((C.i32(((C.i32((C.i32(maxy)-C.i32((C.field(egd,"egd","ogy").value)))))+C.i32(miny))))));
        if(C.i32((flp&2))) (C.field(egd,"egd","ogx").value=C.i16((C.i32(((C.i32((C.i32(maxx)-C.i32((C.field(egd,"egd","ogx").value)))))+C.i32(minx))))));
    }
    for((i=C.field(egd,"egd","fcbeg").value);Number(i<C.field(egd,"egd","fcend").value);(()=>{const old=i;const next=C.i32((old+1));i=next;return next;})()) {
        let fx=C.field((C.field(egd,"egd","fakecorr").address+Number(i)*C.sizes["struct fakecorridor"]),"fakecorridor","fx").value; let fy=C.field((C.field(egd,"egd","fakecorr").address+Number(i)*C.sizes["struct fakecorridor"]),"fakecorridor","fy").value;
        if((Number(!!(Number(!!(Number(!!(Number(C.i32((fx))>=C.i32(minx))&&Number(C.i32((fx))<=C.i32(maxx))))&&Number(C.i32((fy))>=C.i32(miny))))&&Number(C.i32((fy))<=C.i32(maxy)))))) {
            if(C.i32((flp&1))) (C.field((C.field(egd,"egd","fakecorr").address+Number(i)*C.sizes["struct fakecorridor"]),"fakecorridor","fy").value=C.i16((C.i32(((C.i32((C.i32(maxy)-C.i32((fy)))))+C.i32(miny))))));
            if(C.i32((flp&2))) (C.field((C.field(egd,"egd","fakecorr").address+Number(i)*C.sizes["struct fakecorridor"]),"fakecorridor","fx").value=C.i16((C.i32(((C.i32((C.i32(maxx)-C.i32((fx)))))+C.i32(minx))))));
        }
    }
    return;
}

/* randomly transpose top with bottom or left with right or both;
   caller controls which transpositions are allowed */
export function flip_level_rnd(flp,extras)
{
    flp=C.i32(flp);
    extras=C.i8(extras);
    let c=0;
    /* TODO?
     *  Might change rn2(2) to !rn2(3) or (rn2(5) < 2) in order to bias
     *  the outcome towards the traditional orientation.
     */
    if(Number(!!((C.i32((flp&1)))&&((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),975,(C.literal("flip_level_rnd"))),C.rn2(2))):C.rn2(2)))))) (()=>{const old=c;const next=C.i32(C.i32(C.i32(old)|1));c=next;return next;})();
    if(Number(!!((C.i32((flp&2)))&&((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),977,(C.literal("flip_level_rnd"))),C.rn2(2))):C.rn2(2)))))) (()=>{const old=c;const next=C.i32(C.i32(C.i32(old)|2));c=next;return next;})();
    if(c) flip_level(c,extras);
}

export function sel_set_wall_property(x,y,arg)
{
    x=C.i16(x);
    y=C.i16(y);
    let prop=C.cell(arg,"int").value;
    if(Number(!!(Number(!!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))<=C.DBWALL))||(Number(!!(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))==C.TREE)||(Number(!!(C.i32(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","arboreal").value)&&Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))==C.STONE)))))))))||Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.IRONBARS)))) (()=>{const slot=C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags");const old=slot.value;const next=C.u32(C.i32(C.i32(old)|prop));slot.value=next;return next;})();
    /* 3.6.2: made iron bars eligible to be flagged nondiggable
           (checked by chewing(hack.c) and zap_over_floor(zap.c)) */
}

/*
 * Make walls of the area (x1, y1, x2, y2) non diggable/non passwall-able
 */
export function set_wall_property(x1,y1,x2,y2,prop)
{
    x1=C.i16(x1);
    y1=C.i16(y1);
    x2=C.i16(x2);
    y2=C.i16(y2);
    prop=C.i32(prop);
    const stackFrame=C.stackSave();
    try {
    const propAddress=C.stackAlloc(4);C.cell(propAddress,"int").value=prop;
    let x; let y;
    (x1=C.i16(((Number(C.i32((x1))>(1))?C.i32((x1)):(1)))));
    (x2=C.i16(((Number(C.i32((x2))<(C.i32((80-1))))?C.i32((x2)):(C.i32((80-1)))))));
    (y1=C.i16(((Number(C.i32((y1))>(0))?C.i32((y1)):(0)))));
    (y2=C.i16(((Number(C.i32((y2))<(C.i32((21-1))))?C.i32((y2)):(C.i32((21-1)))))));
    for((y=y1);Number(C.i32(y)<=C.i32(y2));(()=>{const old=y;const next=C.i16((old+1));y=next;return old;})()) for((x=x1);Number(C.i32(x)<=C.i32(x2));(()=>{const old=x;const next=C.i16((old+1));x=next;return old;})()) {
        sel_set_wall_property(x,y,propAddress);
    }

    } finally {C.stackRestore(stackFrame); }
}

export function remove_boundary_syms()
{
    /*
     * If any CROSSWALLs are found, must change to ROOM after REGION's
     * are laid out.  CROSSWALLS are used to specify "invisible"
     * boundaries where DOOR syms look bad or aren't desirable.
     */
    let x; let y;
    let has_bounds=(C.i8(0));
    for((x=C.i16(0));Number(C.i32(x)<C.i32((80-1)));(()=>{const old=x;const next=C.i16((old+1));x=next;return old;})()) for((y=C.i16(0));Number(C.i32(y)<C.i32((21-1)));(()=>{const old=y;const next=C.i16((old+1));y=next;return old;})()) if(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.CROSSWALL)) {
        (has_bounds=(C.i8(1)));
        break;
    }


    if(has_bounds) {
        for((x=C.i16(0));Number(C.i32(x)<C.field(C.gx,"instance_globals_x","x_maze_max").value);(()=>{const old=x;const next=C.i16((old+1));x=next;return old;})()) for((y=C.i16(0));Number(C.i32(y)<C.field(C.gy,"instance_globals_y","y_maze_max").value);(()=>{const old=y;const next=C.i16((old+1));y=next;return old;})()) if(Number(!!((Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.CROSSWALL))&&C.i32(C.cell(((C.SpLev_Map+Number(x)*(1*21))+Number(y)*1),"char").value)))) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value=C.i8(C.ROOM));


    }
}

/* used by sel_set_door() and link_doors_rooms() */
export function set_door_orientation(x,y)
{
    x=C.i32(x);
    y=C.i32(y);
    let wleft; let wright; let wup; let wdown;
    /* If there's a wall or door on either the left side or right
     * side (or both) of this secret door, make it be horizontal.
     *
     * It is feasible to put SDOOR in a corner, tee, or crosswall
     * position, although once the door is found and opened it won't
     * make a lot sense (diagonal access required).  Still, we try to
     * handle that as best as possible.  For top or bottom tee, using
     * horizontal is the best we can do.  For corner or crosswall,
     * either horizontal or vertical are just as good as each other;
     * we produce horizontal for corners and vertical for crosswalls.
     * For left or right tee, using vertical is best.
     *
     * A secret door with no adjacent walls is also feasible and makes
     * even less sense.  It will be displayed as a vertical wall while
     * hidden and become a vertical door when found.  Before resorting
     * to that, we check for solid rock which hasn't been wallified
     * yet (cf lower leftside of leader's room in Cav quest).
     */
    (wleft=C.i8((Number(!!(C.isok(C.i16(C.i32((x-1))),C.i16(y))&&(Number(!!(Number(!!((Number(!!(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((x-1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))&&Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((x-1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))<=C.DBWALL))))||(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((x-1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))==C.DOOR))))||Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((x-1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.SDOOR)))))))));
    (wright=C.i8((Number(!!(C.isok(C.i16(C.i32((x+1))),C.i16(y))&&(Number(!!(Number(!!((Number(!!(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((x+1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))&&Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((x+1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))<=C.DBWALL))))||(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((x+1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))==C.DOOR))))||Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((x+1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.SDOOR)))))))));
    (wup=C.i8((Number(!!(C.isok(C.i16(x),C.i16(C.i32((y-1))))&&(Number(!!(Number(!!((Number(!!(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((y-1)))*C.sizes["struct rm"]),"rm","typ").value))&&Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((y-1)))*C.sizes["struct rm"]),"rm","typ").value))<=C.DBWALL))))||(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((y-1)))*C.sizes["struct rm"]),"rm","typ").value))==C.DOOR))))||Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((y-1)))*C.sizes["struct rm"]),"rm","typ").value)==C.SDOOR)))))))));
    (wdown=C.i8((Number(!!(C.isok(C.i16(x),C.i16(C.i32((y+1))))&&(Number(!!(Number(!!((Number(!!(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((y+1)))*C.sizes["struct rm"]),"rm","typ").value))&&Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((y+1)))*C.sizes["struct rm"]),"rm","typ").value))<=C.DBWALL))))||(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((y+1)))*C.sizes["struct rm"]),"rm","typ").value))==C.DOOR))))||Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((y+1)))*C.sizes["struct rm"]),"rm","typ").value)==C.SDOOR)))))))));
    if(Number(!!(Number(!!(Number(!!(Number(!(wleft))&&Number(!(wright))))&&Number(!(wup))))&&Number(!(wdown))))) {
        /* out of bounds is treated as implicit wall; should be academic
           because we don't expect to have doors so near the level's edge */
        (wleft=C.i8((Number(!!(Number(!(C.isok(C.i16(C.i32((x-1))),C.i16(y))))||(Number(!!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((x-1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))<C.POOL))||Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((x-1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))==C.IRONBARS)))))))));
        (wright=C.i8((Number(!!(Number(!(C.isok(C.i16(C.i32((x+1))),C.i16(y))))||(Number(!!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((x+1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))<C.POOL))||Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((x+1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))==C.IRONBARS)))))))));
        (wup=C.i8((Number(!!(Number(!(C.isok(C.i16(x),C.i16(C.i32((y-1))))))||(Number(!!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((y-1)))*C.sizes["struct rm"]),"rm","typ").value))<C.POOL))||Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((y-1)))*C.sizes["struct rm"]),"rm","typ").value))==C.IRONBARS)))))))));
        (wdown=C.i8((Number(!!(Number(!(C.isok(C.i16(x),C.i16(C.i32((y+1))))))||(Number(!!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((y+1)))*C.sizes["struct rm"]),"rm","typ").value))<C.POOL))||Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((y+1)))*C.sizes["struct rm"]),"rm","typ").value))==C.IRONBARS)))))))));
    }
    (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","horizontal").value=C.u32(((Number(!!((Number(!!(C.i32(wleft)||C.i32(wright))))&&Number(!((Number(!!(C.i32(wup)&&C.i32(wdown)))))))))?1:0)));
}

/* is x,y right next to room droom? */
export function shared_with_room(x,y,droom)
{
    x=C.i32(x);
    y=C.i32(y);
    let rmno=C.i32(C.i64(((C.i64(((droom-C.field(C.svr,"instance_globals_saved_r","rooms").address)/C.sizes["struct mkroom"])))+C.i64(3))));
    if(Number(!(C.isok(C.i16(x),C.i16(y))))) return (C.i8(0));
    if(Number(!!(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","roomno").value)==rmno)&&Number(!(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","edge").value))))) return (C.i8(0));
    if(Number(!!(Number(!!(C.isok(C.i16(C.i32((x-1))),C.i16(y))&&Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((x-1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","roomno").value)==rmno)))&&Number(C.i32((x-1))<=C.i32(C.field(droom,"mkroom","hx").value))))) return (C.i8(1));
    if(Number(!!(Number(!!(C.isok(C.i16(C.i32((x+1))),C.i16(y))&&Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((x+1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","roomno").value)==rmno)))&&Number(C.i32((x+1))>=C.i32(C.field(droom,"mkroom","lx").value))))) return (C.i8(1));
    if(Number(!!(Number(!!(C.isok(C.i16(x),C.i16(C.i32((y-1))))&&Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((y-1)))*C.sizes["struct rm"]),"rm","roomno").value)==rmno)))&&Number(C.i32((y-1))<=C.i32(C.field(droom,"mkroom","hy").value))))) return (C.i8(1));
    if(Number(!!(Number(!!(C.isok(C.i16(x),C.i16(C.i32((y+1))))&&Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((y+1)))*C.sizes["struct rm"]),"rm","roomno").value)==rmno)))&&Number(C.i32((y+1))>=C.i32(C.field(droom,"mkroom","ly").value))))) return (C.i8(1));
    return (C.i8(0));
}

/* maybe add door at x,y to room droom */
export function maybe_add_door(x,y,droom)
{
    x=C.i32(x);
    y=C.i32(y);
    if(Number(!!(Number(C.i32(C.field(droom,"mkroom","hx").value)>=0)&&(Number(!!(Number(!!((Number(!!(Number(!(C.field(droom,"mkroom","irregular").value))&&C.i32(C.inside_room(droom,C.i16(x),C.i16(y))))))||Number(C.i64(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","roomno").value))==C.i64(((C.i64(((droom-C.field(C.svr,"instance_globals_saved_r","rooms").address)/C.sizes["struct mkroom"])))+C.i64(3))))))||C.i32(shared_with_room(x,y,droom)))))))) {
        C.add_door(C.i16(x),C.i16(y),droom);
    }
}

/* link all doors in the map to their corresponding rooms */
export function link_doors_rooms()
{
    let x; let y;
    let tmpi; let m;
    for((y=0);Number(y<21);(()=>{const old=y;const next=C.i32((old+1));y=next;return old;})()) for((x=0);Number(x<80);(()=>{const old=x;const next=C.i32((old+1));x=next;return old;})()) if(Number(!!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))==C.DOOR))||Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.SDOOR)))) {
        /* in case this door was a '+' or 'S' from the
                   MAP...ENDMAP section without an explicit DOOR
                   directive, set/clear levl[][].horizontal for it */
        set_door_orientation(x,y);
        for((tmpi=0);Number(tmpi<C.field(C.svn,"instance_globals_saved_n","nroom").value);(()=>{const old=tmpi;const next=C.i32((old+1));tmpi=next;return old;})()) {
            maybe_add_door(x,y,(C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(tmpi)*C.sizes["struct mkroom"]));
            for((m=0);Number(m<C.i32(C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(tmpi)*C.sizes["struct mkroom"]),"mkroom","nsubrooms").value));(()=>{const old=m;const next=C.i32((old+1));m=next;return old;})()) {
                maybe_add_door(x,y,C.cell((C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(tmpi)*C.sizes["struct mkroom"]),"mkroom","sbrooms").address+Number(m)*8),"struct mkroom *").value);
            }
        }
    }


}

/*
 * Choose randomly the state (nodoor, open, closed or locked) for a door
 */
export function rnddoor()
{
    const state=C.staticData("rnddoor","state",()=>[0,1,2,4,8]);
    return C.cell((state+Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1152,(C.literal("rnddoor"))),C.rn2(C.i32((C.u64((BigInt((4*5))/BigInt(4)))))))):C.rn2(C.i32((C.u64((BigInt((4*5))/BigInt(4)))))))))*4),"int").value;
}

/*
 * Select a random trap
 */
export function rndtrap()
{
    let rtrap;
    do {
        (rtrap=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1164,(C.literal("rndtrap"))),C.rnd(C.i32((C.TRAPNUM-1))))):C.rnd(C.i32((C.TRAPNUM-1))))));
        switch(rtrap) {
            case (C.HOLE):
                /* no random holes on special levels */
                case (C.VIBRATING_SQUARE):
                    case (C.MAGIC_PORTAL):
                        (rtrap=C.NO_TRAP);
            break;
            case (C.TRAPDOOR):
                if(Number(!(C.Can_dig_down(C.field(C.u,"you","uz").address)))) (rtrap=C.NO_TRAP);
            break;
            case (C.LEVEL_TELEP):
                case (C.TELEP_TRAP):
                    if(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","noteleport").value) (rtrap=C.NO_TRAP);
            break;
            case (C.ROLLING_BOULDER_TRAP):
                case (C.ROCKTRAP):
                    if((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_astral_level").address,"d_level","dnum").value)))) (rtrap=C.NO_TRAP);
            break;
        }
    } while(Number(rtrap==C.NO_TRAP));
    return rtrap;
}

/*
 * Translate a given coordinate from a special level definition into an actual
 * location on the map.
 *
 * If x or y is negative, we generate a random coordinate within the area. If
 * not negative, they are interpreted as relative to the last defined map or
 * room, and are output as absolute svl.level.locations coordinates.
 *
 * The "humidity" flag is used to ensure that engravings aren't created
 * underwater, or eels on dry land.
 */
export function get_location(x,y,humidity,croom)
{
    humidity=C.u32(humidity);
    const stackFrame=C.stackSave();
    try {
    let cpt=0;
    let mx; let my; let sx; let sy;
    found_it: {
        if(croom) {
            (mx=C.i32(C.field(croom,"mkroom","lx").value));
            (my=C.i32(C.field(croom,"mkroom","ly").value));
            (sx=C.i32((C.i32((C.i32(C.field(croom,"mkroom","hx").value)-mx))+1)));
            (sy=C.i32((C.i32((C.i32(C.field(croom,"mkroom","hy").value)-my))+1)));
        } else {
            (mx=C.i32(C.field(C.gx,"instance_globals_x","xstart").value));
            (my=C.i32(C.field(C.gy,"instance_globals_y","ystart").value));
            (sx=C.i32(C.field(C.gx,"instance_globals_x","xsize").value));
            (sy=C.i32(C.field(C.gy,"instance_globals_y","ysize").value));
        }
        if(Number(C.i32(C.cell(x,"short").value)>=0)) {
            /* normal locations */
            (()=>{const slot=C.cell(x,"short");const old=slot.value;const next=C.i16(C.i32(C.i32(old)+mx));slot.value=next;return next;})();
            (()=>{const slot=C.cell(y,"short");const old=slot.value;const next=C.i16(C.i32(C.i32(old)+my));slot.value=next;return next;})();
        } else {
            /* random location */
            do {
                if(croom) {
                    /* handle irregular areas */
                    let tmpc=C.stackAlloc(C.sizes["struct nhcoord"]);
                    C.somexy(croom,tmpc);
                    (C.cell(x,"short").value=C.field(tmpc,"nhcoord","x").value);
                    (C.cell(y,"short").value=C.field(tmpc,"nhcoord","y").value);
                } else {
                    (C.cell(x,"short").value=C.i16(C.i32((mx+((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1233,(C.literal("get_location"))),C.rn2(sx))):C.rn2(sx)))))));
                    (C.cell(y,"short").value=C.i16(C.i32((my+((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1234,(C.literal("get_location"))),C.rn2(sy))):C.rn2(sy)))))));
                }
                if(is_ok_location(C.cell(x,"short").value,C.cell(y,"short").value,humidity)) break;
            } while(Number((()=>{const old=cpt;const next=C.i32((old+1));cpt=next;return next;})()<100));
            if(Number(cpt>=100)) {
                let xx; let yy;
                /* last try */
                for((xx=0);Number(xx<sx);(()=>{const old=xx;const next=C.i32((old+1));xx=next;return old;})()) for((yy=0);Number(yy<sy);(()=>{const old=yy;const next=C.i32((old+1));yy=next;return old;})()) {
                    (C.cell(x,"short").value=C.i16(C.i32((mx+xx))));
                    (C.cell(y,"short").value=C.i16(C.i32((my+yy))));
                    if(is_ok_location(C.cell(x,"short").value,C.cell(y,"short").value,humidity)) break found_it;
                }

                if(Number(!((C.u32((humidity&C.u32(32))))))) {
                    C.variadic(1,C.literal("get_location:  can't find a place!"));
                } else {
                    (C.cell(x,"short").value=(C.cell(y,"short").value=C.i16(C.i32((-1)))));
                }
            }
        }
    }
    ;
    if(Number(!!(Number(!((C.u32((humidity&C.u32(16))))))&&Number(!(C.isok(C.cell(x,"short").value,C.cell(y,"short").value)))))) {
        if(Number(!((C.u32((humidity&C.u32(32))))))) {
            /*warning("get_location:  (%d,%d) out of bounds", *x, *y);*/
            (C.cell(x,"short").value=C.i16(C.field(C.gx,"instance_globals_x","x_maze_max").value));
            (C.cell(y,"short").value=C.i16(C.field(C.gy,"instance_globals_y","y_maze_max").value));
        } else {
            (C.cell(x,"short").value=(C.cell(y,"short").value=C.i16(C.i32((-1)))));
        }
    }
    } finally {C.stackRestore(stackFrame); }
}

export const is_ok_location_func=C=>0;
export function set_ok_location_func(func)
{
    (C.cell(C.is_ok_location_func,"signed char (*)(coordxy, coordxy)").value=func);
}

export function is_ok_location(x,y,humidity)
{
    x=C.i16(x);
    y=C.i16(y);
    humidity=C.u32(humidity);
    let typ=C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value);
    if(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address))))))) return (C.i8(1));
    /* accept any spot */
    if(C.cell(C.is_ok_location_func,"signed char (*)(coordxy, coordxy)").value) return C.callProc(C.cell(C.is_ok_location_func,"signed char (*)(coordxy, coordxy)").value,"boolean (*)(coordxy, coordxy)",x,y);
    /* TODO: Should perhaps check if wall is diggable/passwall? */
    if(C.u32((humidity&C.u32(16)))) return (C.i8(1));
    if(Number(!!((C.u32((humidity&C.u32(8))))&&(Number((typ)<C.POOL))))) return (C.i8(1));
    if(Number(!!((C.u32((humidity&C.u32((C.i32((1|64)))))))&&(Number((typ)>C.DOOR))))) {
        let bould=C.i8((Number(C.sobj_at(C.BOULDER,x,y)!=(0))));
        if(Number(!!(Number(!(bould))||(Number(!!(C.i32(bould)&&(C.u32((humidity&C.u32(8)))))))))) return (C.i8(1));
    }
    if(Number(!!((C.u32((humidity&C.u32(2))))&&C.i32(C.is_pool(x,y))))) return (C.i8(1));
    if(Number(!!((C.u32((humidity&C.u32(4))))&&C.i32(C.is_lava(x,y))))) return (C.i8(1));
    return (C.i8(0));
}

export function pm_good_location(x,y,pm)
{
    x=C.i16(x);
    y=C.i16(y);
    return is_ok_location(x,y,C.u32(pm_to_humidity(pm)));
}

export function get_unpacked_coord(loc,defhumidity)
{
    loc=C.i64(loc);
    defhumidity=C.i32(defhumidity);
    const c=C.staticData("get_unpacked_coord","c",()=>null);
    if(C.i64((loc&16777216n))) {
        (C.field(c,"unpacked_coord","x").value=(C.field(c,"unpacked_coord","y").value=C.i32((-1))));
        (C.field(c,"unpacked_coord","is_random").value=C.i16(1));
        (C.field(c,"unpacked_coord","getloc_flags").value=C.u32((C.i64((loc&C.i64((~16777216n)))))));
        if(Number(!(C.field(c,"unpacked_coord","getloc_flags").value))) (C.field(c,"unpacked_coord","getloc_flags").value=C.u32(defhumidity));
    } else {
        (C.field(c,"unpacked_coord","is_random").value=C.i16(0));
        (C.field(c,"unpacked_coord","getloc_flags").value=C.u32(defhumidity));
        (C.field(c,"unpacked_coord","x").value=C.i32((C.i64((loc&C.i64(255))))));
        (C.field(c,"unpacked_coord","y").value=C.i32((C.i64(((C.i64((loc>>BigInt(16))))&C.i64(255))))));
    }
    return C.recordValue(c,C.sizes["unpacked_coord"]);
}

export function get_location_coord(x,y,humidity,croom,crd)
{
    humidity=C.i32(humidity);
    crd=C.i64(crd);
    const stackFrame=C.stackSave();
    try {
    let c=C.stackAlloc(C.sizes["unpacked_coord"]);
    C.copyRecord(c,get_unpacked_coord(crd,humidity),C.sizes["unpacked_coord"]);
    (C.cell(x,"short").value=C.i16(C.field(c,"unpacked_coord","x").value));
    (C.cell(y,"short").value=C.i16(C.field(c,"unpacked_coord","y").value));
    get_location(x,y,C.u32((C.field(c,"unpacked_coord","getloc_flags").value|C.u32(((C.i32(C.field(c,"unpacked_coord","is_random").value)?32:0))))),croom);
    if(Number(!!(Number(!!(Number(C.i32(C.cell(x,"short").value)==C.i32((-1)))&&Number(C.i32(C.cell(y,"short").value)==C.i32((-1)))))&&C.i32(C.field(c,"unpacked_coord","is_random").value)))) get_location(x,y,C.u32(humidity),croom);
    } finally {C.stackRestore(stackFrame); }
}

/*
 * Get a relative position inside a room.
 * negative values for x or y means RANDOM!
 */
export function get_room_loc(x,y,croom)
{
    const stackFrame=C.stackSave();
    try {
    let c=C.stackAlloc(C.sizes["struct nhcoord"]);
    if(Number(!!(Number(C.i32(C.cell(x,"short").value)<0)&&Number(C.i32(C.cell(y,"short").value)<0)))) {
        if(C.somexy(croom,c)) {
            (C.cell(x,"short").value=C.field(c,"nhcoord","x").value);
            (C.cell(y,"short").value=C.field(c,"nhcoord","y").value);
        } else C.variadic(2,C.literal("get_room_loc : can't find a place!"));
    } else {
        if(Number(C.i32(C.cell(x,"short").value)<0)) (C.cell(x,"short").value=C.i16(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1372,(C.literal("get_room_loc"))),C.rn2(C.i32((C.i32((C.i32(C.field(croom,"mkroom","hx").value)-C.i32(C.field(croom,"mkroom","lx").value)))+1))))):C.rn2(C.i32((C.i32((C.i32(C.field(croom,"mkroom","hx").value)-C.i32(C.field(croom,"mkroom","lx").value)))+1)))))));
        if(Number(C.i32(C.cell(y,"short").value)<0)) (C.cell(y,"short").value=C.i16(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1374,(C.literal("get_room_loc"))),C.rn2(C.i32((C.i32((C.i32(C.field(croom,"mkroom","hy").value)-C.i32(C.field(croom,"mkroom","ly").value)))+1))))):C.rn2(C.i32((C.i32((C.i32(C.field(croom,"mkroom","hy").value)-C.i32(C.field(croom,"mkroom","ly").value)))+1)))))));
        (()=>{const slot=C.cell(x,"short");const old=slot.value;const next=C.i16(C.i32(C.i32(old)+C.i32(C.field(croom,"mkroom","lx").value)));slot.value=next;return next;})();
        (()=>{const slot=C.cell(y,"short");const old=slot.value;const next=C.i16(C.i32(C.i32(old)+C.i32(C.field(croom,"mkroom","ly").value)));slot.value=next;return next;})();
    }
    } finally {C.stackRestore(stackFrame); }
}

/*
 * Get a relative position inside a room.
 * negative values for x or y means RANDOM!
 */
export function get_free_room_loc(x,y,croom,pos)
{
    pos=C.i64(pos);
    const stackFrame=C.stackSave();
    try {
    let try_xAddress=C.stackAlloc(2); let try_yAddress=C.stackAlloc(2);
    let trycnt=0;
    get_location_coord(try_xAddress,try_yAddress,1,croom,pos);
    if(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(try_xAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.cell(try_yAddress,"short").value)*C.sizes["struct rm"]),"rm","typ").value)!=C.ROOM)) {
        do {
            ((C.cell(try_xAddress,"short").value=C.cell(x,"short").value),(C.cell(try_yAddress,"short").value=C.cell(y,"short").value));
            get_room_loc(try_xAddress,try_yAddress,croom);
        } while(Number(!!(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(try_xAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.cell(try_yAddress,"short").value)*C.sizes["struct rm"]),"rm","typ").value)!=C.ROOM)&&Number((()=>{const old=trycnt;const next=C.i32((old+1));trycnt=next;return next;})()<=100))));
        if(Number(trycnt>100)) C.variadic(3,C.literal("get_free_room_loc:  can't find a place!"));
    }
    ((C.cell(x,"short").value=C.cell(try_xAddress,"short").value),(C.cell(y,"short").value=C.cell(try_yAddress,"short").value));
    } finally {C.stackRestore(stackFrame); }
}

export function check_room(lowx,ddx,lowy,ddy,vault)
{
    vault=C.i8(vault);
    let x; let y; let hix=C.i32((C.i32(C.cell(lowx,"short").value)+C.i32(C.cell(ddx,"short").value))); let hiy=C.i32((C.i32(C.cell(lowy,"short").value)+C.i32(C.cell(ddy,"short").value)));
    let lev;
    let xlim; let ylim; let ymax;
    let s_lowx; let s_ddx; let s_lowy; let s_ddy;
    (s_lowx=C.cell(lowx,"short").value);
    (s_ddx=C.cell(ddx,"short").value);
    (s_lowy=C.cell(lowy,"short").value);
    (s_ddy=C.cell(ddy,"short").value);
    (xlim=C.i32((4+((C.i32(vault)?1:0)))));
    (ylim=C.i32((3+((C.i32(vault)?1:0)))));
    if(Number(C.i32(C.cell(lowx,"short").value)<3)) (C.cell(lowx,"short").value=C.i16(3));
    if(Number(C.i32(C.cell(lowy,"short").value)<2)) (C.cell(lowy,"short").value=C.i16(2));
    if(Number(hix>C.i32((80-3)))) (hix=C.i32((80-3)));
    if(Number(hiy>C.i32((21-3)))) (hiy=C.i32((21-3)));
    chk: for(;;) {
        if(Number(!!(Number(hix<=C.i32(C.cell(lowx,"short").value))||Number(hiy<=C.i32(C.cell(lowy,"short").value))))) return (C.i8(0));
        if(Number(!!(Number(!!(Number(!!(Number(!!(C.i32(C.field(C.gi,"instance_globals_i","in_mk_themerooms").value)&&(Number(C.i32(s_lowx)!=C.i32(C.cell(lowx,"short").value)))))&&(Number(C.i32(s_ddx)!=C.i32(C.cell(ddx,"short").value)))))&&(Number(C.i32(s_lowy)!=C.i32(C.cell(lowy,"short").value)))))&&(Number(C.i32(s_ddy)!=C.i32(C.cell(ddy,"short").value)))))) return (C.i8(0));
        /* check area around room (and make room smaller if necessary) */
        for((x=C.i32((C.i32(C.cell(lowx,"short").value)-xlim)));Number(x<=C.i32((hix+xlim)));(()=>{const old=x;const next=C.i32((old+1));x=next;return old;})()) {
            if(Number(!!(Number(x<=0)||Number(x>=80)))) continue;
            (y=C.i32((C.i32(C.cell(lowy,"short").value)-ylim)));
            (ymax=C.i32((hiy+ylim)));
            if(Number(y<0)) (y=0);
            if(Number(ymax>=21)) (ymax=(C.i32((21-1))));
            (lev=((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]));
            for(;Number(y<=ymax);(()=>{const old=y;const next=C.i32((old+1));y=next;return old;})()) {
                if(Number(C.i32(C.field((()=>{const old=lev;const next=C.ptr((old+Number(C.sizes["struct rm"])));lev=next;return old;})(),"rm","typ").value)!=C.STONE)) {
                    if(Number(!(vault))) {
                        do {
                            if(C.debugcore(C.literal("sp_lev.c"),(C.i8(1)))) {
                                let save_plnmsg=C.field(C.iflags,"instance_flags","last_msg").value;
                                C.variadic(4,C.literal("strange area [%d,%d] in check_room."),x,y);
                                (C.field(C.iflags,"instance_flags","last_msg").value=save_plnmsg);
                            }
                        } while(0);
                    }
                    if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1455,(C.literal("check_room"))),C.rn2(3))):C.rn2(3)))))) return (C.i8(0));
                    if(C.field(C.gi,"instance_globals_i","in_mk_themerooms").value) return (C.i8(0));
                    if(Number(x<C.i32(C.cell(lowx,"short").value))) (C.cell(lowx,"short").value=C.i16(C.i32((C.i32((x+xlim))+1))));
 else (hix=C.i32((C.i32((x-xlim))-1)));
                    if(Number(y<C.i32(C.cell(lowy,"short").value))) (C.cell(lowy,"short").value=C.i16(C.i32((C.i32((y+ylim))+1))));
 else (hiy=C.i32((C.i32((y-ylim))-1)));
                    continue chk;
                }
            }
        }
        (C.cell(ddx,"short").value=C.i16(C.i32((hix-C.i32(C.cell(lowx,"short").value)))));
        (C.cell(ddy,"short").value=C.i16(C.i32((hiy-C.i32(C.cell(lowy,"short").value)))));
        if(Number(!!(Number(!!(Number(!!(Number(!!(C.i32(C.field(C.gi,"instance_globals_i","in_mk_themerooms").value)&&(Number(C.i32(s_lowx)!=C.i32(C.cell(lowx,"short").value)))))&&(Number(C.i32(s_ddx)!=C.i32(C.cell(ddx,"short").value)))))&&(Number(C.i32(s_lowy)!=C.i32(C.cell(lowy,"short").value)))))&&(Number(C.i32(s_ddy)!=C.i32(C.cell(ddy,"short").value)))))) return (C.i8(0));
        return (C.i8(1));
    }
}

/*
 * Create a new room.
 * This is still very incomplete...
 */
export function create_room(x,y,w,h,xal,yal,rtype,rlit)
{
    x=C.i16(x);
    y=C.i16(y);
    w=C.i16(w);
    h=C.i16(h);
    xal=C.i16(xal);
    yal=C.i16(yal);
    rtype=C.i16(rtype);
    rlit=C.i16(rlit);
    const stackFrame=C.stackSave();
    try {
    let xabsAddress=C.stackAlloc(2); C.cell(xabsAddress,"short").value=C.i16(0); let yabsAddress=C.stackAlloc(2); C.cell(yabsAddress,"short").value=C.i16(0);
    let wtmp; let htmp; let xaltmp; let yaltmp; let xtmp; let ytmp;
    let r1=0; let r2=C.stackAlloc(C.sizes["struct nhrect"]);
    let trycnt=0;
    let vault=(C.i8(0));
    let xlim=4; let ylim=3;
    if(Number(C.i32(rtype)==C.i32((-1)))) (rtype=C.i16(C.OROOM));
    /* Is the type random ? */
    if(Number(C.i32(rtype)==C.VAULT)) {
        (vault=(C.i8(1)));
        (()=>{const old=xlim;const next=C.i32((old+1));xlim=next;return old;})();
        (()=>{const old=ylim;const next=C.i32((old+1));ylim=next;return old;})();
    }
    /* on low levels the room is lit (usually) */
    /* some other rooms may require lighting */
    /* is light state random ? */
    (rlit=C.i16(C.litstate_rnd(C.i32(rlit))));
    /*
     * Here we will try to create a room. If some parameters are
     * random we are willing to make several try before we give
     * it up.
     */
    do {
        let xborder; let yborder;
        (wtmp=C.i32(w));
        (htmp=C.i32(h));
        (xtmp=C.i32(x));
        (ytmp=C.i32(y));
        (xaltmp=C.i32(xal));
        (yaltmp=C.i32(yal));
        /* First case : a totally random room */
        if(Number(!!((Number(!!(Number(!!(Number(!!(Number(!!(Number(xtmp<0)&&Number(ytmp<0)))&&Number(wtmp<0)))&&Number(xaltmp<0)))&&Number(yaltmp<0))))||C.i32(vault)))) {
            let hx; let hy; let lx; let ly; let dxAddress=C.stackAlloc(2); let dyAddress=C.stackAlloc(2);
            (r1=C.rnd_rect());
            /* Get a random rectangle */
            if(Number(!(r1))) {
                /* No more free rectangles ! */
                do {
                    if(C.debugcore(C.literal("sp_lev.c"),(C.i8(1)))) {
                        let save_plnmsg=C.field(C.iflags,"instance_flags","last_msg").value;
                        C.variadic(5,C.literal("No more rects..."));
                        (C.field(C.iflags,"instance_flags","last_msg").value=save_plnmsg);
                    }
                } while(0);
                return (C.i8(0));
            }
            (hx=C.field(r1,"nhrect","hx").value);
            (hy=C.field(r1,"nhrect","hy").value);
            (lx=C.field(r1,"nhrect","lx").value);
            (ly=C.field(r1,"nhrect","ly").value);
            if(vault) {
                (C.cell(dxAddress,"short").value=(C.cell(dyAddress,"short").value=C.i16(1)));
            } else {
                (C.cell(dxAddress,"short").value=C.i16(C.i32((2+((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1548,(C.literal("create_room"))),C.rn2(((Number(C.i32((C.i32(hx)-C.i32(lx)))>28))?12:8)))):C.rn2(((Number(C.i32((C.i32(hx)-C.i32(lx)))>28))?12:8))))))));
                (C.cell(dyAddress,"short").value=C.i16(C.i32((2+((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1549,(C.literal("create_room"))),C.rn2(4))):C.rn2(4)))))));
                if(Number(C.i32((C.i32(C.cell(dxAddress,"short").value)*C.i32(C.cell(dyAddress,"short").value)))>50)) (C.cell(dyAddress,"short").value=C.i16(C.i32(Math.trunc((50/C.i32(C.cell(dxAddress,"short").value))))));
            }
            (xborder=C.i16(((Number(!!(Number(C.i32(lx)>0)&&Number(C.i32(hx)<C.i32((80-1))))))?C.i32((2*xlim)):C.i32((xlim+1)))));
            (yborder=C.i16(((Number(!!(Number(C.i32(ly)>0)&&Number(C.i32(hy)<C.i32((21-1))))))?C.i32((2*ylim)):C.i32((ylim+1)))));
            if(Number(!!(Number(C.i32((C.i32(hx)-C.i32(lx)))<C.i32((C.i32((C.i32(C.cell(dxAddress,"short").value)+3))+C.i32(xborder))))||Number(C.i32((C.i32(hy)-C.i32(ly)))<C.i32((C.i32((C.i32(C.cell(dyAddress,"short").value)+3))+C.i32(yborder))))))) {
                (r1=0);
                continue;
            }
            (C.cell(xabsAddress,"short").value=C.i16(C.i32((C.i32((C.i32(lx)+((Number(C.i32(lx)>0)?xlim:3))))+((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1560,(C.literal("create_room"))),C.rn2(C.i32((C.i32((C.i32((C.i32((C.i32(hx)-((Number(C.i32(lx)>0)?C.i32(lx):3))))-C.i32(C.cell(dxAddress,"short").value)))-C.i32(xborder)))+1))))):C.rn2(C.i32((C.i32((C.i32((C.i32((C.i32(hx)-((Number(C.i32(lx)>0)?C.i32(lx):3))))-C.i32(C.cell(dxAddress,"short").value)))-C.i32(xborder)))+1)))))))));
            (C.cell(yabsAddress,"short").value=C.i16(C.i32((C.i32((C.i32(ly)+((Number(C.i32(ly)>0)?ylim:2))))+((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1562,(C.literal("create_room"))),C.rn2(C.i32((C.i32((C.i32((C.i32((C.i32(hy)-((Number(C.i32(ly)>0)?C.i32(ly):2))))-C.i32(C.cell(dyAddress,"short").value)))-C.i32(yborder)))+1))))):C.rn2(C.i32((C.i32((C.i32((C.i32((C.i32(hy)-((Number(C.i32(ly)>0)?C.i32(ly):2))))-C.i32(C.cell(dyAddress,"short").value)))-C.i32(yborder)))+1)))))))));
            if(Number(!!(Number(!!(Number(!!(Number(C.i32(ly)==0)&&Number(C.i32(hy)>=C.i32((21-1)))))&&(Number(!!(Number(!(C.field(C.svn,"instance_globals_saved_n","nroom").value))||Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1564,(C.literal("create_room"))),C.rn2(C.field(C.svn,"instance_globals_saved_n","nroom").value))):C.rn2(C.field(C.svn,"instance_globals_saved_n","nroom").value))))))))))&&(Number(C.i32((C.i32(C.cell(yabsAddress,"short").value)+C.i32(C.cell(dyAddress,"short").value)))>C.i32(Math.trunc((21/2)))))))) {
                (C.cell(yabsAddress,"short").value=C.i16((C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1566,(C.literal("create_room"))),C.rn2(3))):C.rn2(3)))+(2))))));
                if(Number(!!(Number(C.field(C.svn,"instance_globals_saved_n","nroom").value<4)&&Number(C.i32(C.cell(dyAddress,"short").value)>1)))) (()=>{const slot=C.cell(dyAddress,"short");const old=slot.value;const next=C.i16((old-1));slot.value=next;return old;})();
            }
            if(Number(!(check_room(xabsAddress,dxAddress,yabsAddress,dyAddress,vault)))) {
                (r1=0);
                continue;
            }
            (wtmp=C.i32((C.i32(C.cell(dxAddress,"short").value)+1)));
            (htmp=C.i32((C.i32(C.cell(dyAddress,"short").value)+1)));
            (C.field(r2,"nhrect","lx").value=C.i16(C.i32((C.i32(C.cell(xabsAddress,"short").value)-1))));
            (C.field(r2,"nhrect","ly").value=C.i16(C.i32((C.i32(C.cell(yabsAddress,"short").value)-1))));
            (C.field(r2,"nhrect","hx").value=C.i16(C.i32((C.i32(C.cell(xabsAddress,"short").value)+wtmp))));
            (C.field(r2,"nhrect","hy").value=C.i16(C.i32((C.i32(C.cell(yabsAddress,"short").value)+htmp))));
        } else {
            /* Only some parameters are random */
            let rndpos=0;
            let dxAddress=C.stackAlloc(2); let dyAddress=C.stackAlloc(2);
            if(Number(!!(Number(xtmp<0)&&Number(ytmp<0)))) {
                /* Position is RANDOM */
                (xtmp=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1585,(C.literal("create_room"))),C.rnd(5))):C.rnd(5))));
                (ytmp=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1586,(C.literal("create_room"))),C.rnd(5))):C.rnd(5))));
                (rndpos=1);
            }
            if(Number(!!(Number(wtmp<0)||Number(htmp<0)))) {
                /* Size is RANDOM */
                (wtmp=(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1590,(C.literal("create_room"))),C.rn2(15))):C.rn2(15)))+(3)))));
                (htmp=(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1591,(C.literal("create_room"))),C.rn2(8))):C.rn2(8)))+(2)))));
            }
            if(Number(xaltmp==C.i32((-1)))) (xaltmp=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1594,(C.literal("create_room"))),C.rnd(3))):C.rnd(3))));
            /* Horizontal alignment is RANDOM */
            if(Number(yaltmp==C.i32((-1)))) (yaltmp=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1596,(C.literal("create_room"))),C.rnd(3))):C.rnd(3))));
            /* Vertical alignment is RANDOM */
            /* Try to generate real (absolute) coordinates here! */
            (C.cell(xabsAddress,"short").value=C.i16(C.i32(((C.i32(Math.trunc(((C.i32(((C.i32((xtmp-1)))*80)))/5))))+1))));
            (C.cell(yabsAddress,"short").value=C.i16(C.i32(((C.i32(Math.trunc(((C.i32(((C.i32((ytmp-1)))*21)))/5))))+1))));
            switch(xaltmp) {
                case (1):
                    break;
                case (5):
                    (()=>{const slot=C.cell(xabsAddress,"short");const old=slot.value;const next=C.i16(C.i32(C.i32(old)+C.i32(((C.i32(Math.trunc((80/5))))-wtmp))));slot.value=next;return next;})();
                break;
                case (3):
                    (()=>{const slot=C.cell(xabsAddress,"short");const old=slot.value;const next=C.i16(C.i32(C.i32(old)+C.i32(Math.trunc(((C.i32(((C.i32(Math.trunc((80/5))))-wtmp)))/2)))));slot.value=next;return next;})();
                break;
            }
            switch(yaltmp) {
                case (1):
                    break;
                case (5):
                    (()=>{const slot=C.cell(yabsAddress,"short");const old=slot.value;const next=C.i16(C.i32(C.i32(old)+C.i32(((C.i32(Math.trunc((21/5))))-htmp))));slot.value=next;return next;})();
                break;
                case (3):
                    (()=>{const slot=C.cell(yabsAddress,"short");const old=slot.value;const next=C.i16(C.i32(C.i32(old)+C.i32(Math.trunc(((C.i32(((C.i32(Math.trunc((21/5))))-htmp)))/2)))));slot.value=next;return next;})();
                break;
            }
            if(Number(C.i32((C.i32((C.i32(C.cell(xabsAddress,"short").value)+wtmp))-1))>C.i32((80-2)))) (C.cell(xabsAddress,"short").value=C.i16(C.i32((C.i32((80-wtmp))-3))));
            if(Number(C.i32(C.cell(xabsAddress,"short").value)<2)) (C.cell(xabsAddress,"short").value=C.i16(2));
            if(Number(C.i32((C.i32((C.i32(C.cell(yabsAddress,"short").value)+htmp))-1))>C.i32((21-2)))) (C.cell(yabsAddress,"short").value=C.i16(C.i32((C.i32((21-htmp))-3))));
            if(Number(C.i32(C.cell(yabsAddress,"short").value)<2)) (C.cell(yabsAddress,"short").value=C.i16(2));
            /* Try to find a rectangle that fit our room ! */
            (C.field(r2,"nhrect","lx").value=C.i16(C.i32((C.i32(C.cell(xabsAddress,"short").value)-1))));
            (C.field(r2,"nhrect","ly").value=C.i16(C.i32((C.i32(C.cell(yabsAddress,"short").value)-1))));
            (C.field(r2,"nhrect","hx").value=C.i16(C.i32((C.i32((C.i32(C.cell(xabsAddress,"short").value)+wtmp))+rndpos))));
            (C.field(r2,"nhrect","hy").value=C.i16(C.i32((C.i32((C.i32(C.cell(yabsAddress,"short").value)+htmp))+rndpos))));
            (r1=C.get_rect(r2));
            (C.cell(dxAddress,"short").value=C.i16(wtmp));
            (C.cell(dyAddress,"short").value=C.i16(htmp));
            if(Number(!!(r1&&Number(!(check_room(xabsAddress,dxAddress,yabsAddress,dyAddress,vault)))))) {
                (r1=0);
            }
        }
    } while(Number(!!(Number((()=>{const old=trycnt;const next=C.i32((old+1));trycnt=next;return next;})()<=100)&&Number(!(r1)))));
    if(Number(!(r1))) {
        /* creation of room failed ? */
        return (C.i8(0));
    }
    C.split_rects(r1,r2);
    if(Number(!(vault))) {
        (C.cell((C.field(C.gs,"instance_globals_s","smeq").address+Number(C.field(C.svn,"instance_globals_saved_n","nroom").value)*4),"int").value=C.field(C.svn,"instance_globals_saved_n","nroom").value);
        C.add_room(C.cell(xabsAddress,"short").value,C.cell(yabsAddress,"short").value,C.i16(C.i32((C.i32((C.i32(C.cell(xabsAddress,"short").value)+wtmp))-1))),C.i16(C.i32((C.i32((C.i32(C.cell(yabsAddress,"short").value)+htmp))-1))),C.i8(rlit),C.i8(rtype),(C.i8(0)));
    } else {
        (C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(C.field(C.svn,"instance_globals_saved_n","nroom").value)*C.sizes["struct mkroom"]),"mkroom","lx").value=C.cell(xabsAddress,"short").value);
        (C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(C.field(C.svn,"instance_globals_saved_n","nroom").value)*C.sizes["struct mkroom"]),"mkroom","ly").value=C.cell(yabsAddress,"short").value);
    }
    return (C.i8(1));
    } finally {C.stackRestore(stackFrame); }
}

/*
 * Create a subroom in room proom at pos x,y with width w & height h.
 * x & y are relative to the parent room.
 */
export function create_subroom(proom,x,y,w,h,rtype,rlit)
{
    x=C.i16(x);
    y=C.i16(y);
    w=C.i16(w);
    h=C.i16(h);
    rtype=C.i16(rtype);
    rlit=C.i16(rlit);
    let width; let height;
    (width=C.i16(C.i32((C.i32((C.i32(C.field(proom,"mkroom","hx").value)-C.i32(C.field(proom,"mkroom","lx").value)))+1))));
    (height=C.i16(C.i32((C.i32((C.i32(C.field(proom,"mkroom","hy").value)-C.i32(C.field(proom,"mkroom","ly").value)))+1))));
    /* There is a minimum size for the parent room */
    if(Number(!!(Number(C.i32(width)<4)||Number(C.i32(height)<4)))) return (C.i8(0));
    /* Check for random position, size, etc... */
    if(Number(C.i32(w)==C.i32((-1)))) (w=C.i16(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1686,(C.literal("create_subroom"))),C.rnd(C.i32((C.i32(width)-3))))):C.rnd(C.i32((C.i32(width)-3)))))));
    if(Number(C.i32(h)==C.i32((-1)))) (h=C.i16(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1688,(C.literal("create_subroom"))),C.rnd(C.i32((C.i32(height)-3))))):C.rnd(C.i32((C.i32(height)-3)))))));
    if(Number(C.i32(x)==C.i32((-1)))) (x=C.i16(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1690,(C.literal("create_subroom"))),C.rnd(C.i32((C.i32(width)-C.i32(w)))))):C.rnd(C.i32((C.i32(width)-C.i32(w))))))));
    if(Number(C.i32(y)==C.i32((-1)))) (y=C.i16(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1692,(C.literal("create_subroom"))),C.rnd(C.i32((C.i32(height)-C.i32(h)))))):C.rnd(C.i32((C.i32(height)-C.i32(h))))))));
    if(Number(C.i32(x)==1)) (x=C.i16(0));
    if(Number(C.i32(y)==1)) (y=C.i16(0));
    if(Number((C.i32((C.i32((C.i32(x)+C.i32(w)))+1)))==C.i32(width))) (()=>{const old=x;const next=C.i16((old+1));x=next;return old;})();
    if(Number((C.i32((C.i32((C.i32(y)+C.i32(h)))+1)))==C.i32(height))) (()=>{const old=y;const next=C.i16((old+1));y=next;return old;})();
    if(Number(C.i32(rtype)==C.i32((-1)))) (rtype=C.i16(C.OROOM));
    (rlit=C.i16(C.litstate_rnd(C.i32(rlit))));
    C.add_subroom(proom,C.i16(C.i32((C.i32(C.field(proom,"mkroom","lx").value)+C.i32(x)))),C.i16(C.i32((C.i32(C.field(proom,"mkroom","ly").value)+C.i32(y)))),C.i16(C.i32((C.i32((C.i32((C.i32(C.field(proom,"mkroom","lx").value)+C.i32(x)))+C.i32(w)))-1))),C.i16(C.i32((C.i32((C.i32((C.i32(C.field(proom,"mkroom","ly").value)+C.i32(y)))+C.i32(h)))-1))),C.i8(rlit),C.i8(rtype),(C.i8(0)));
    return (C.i8(1));
}

/*
 * Create a new door in a room.
 * It's placed on a wall (north, south, east or west).
 */
export function create_door(dd,broom)
{
    let x=0; let y=0;
    let trycnt;
    if(Number(C.i32(C.field(dd,"room_door","secret").value)==C.i32((-1)))) (C.field(dd,"room_door","secret").value=C.i16(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1720,(C.literal("create_door"))),C.rn2(2))):C.rn2(2)))));
    if(Number(C.i32(C.field(dd,"room_door","wall").value)==C.i32((-1)))) (C.field(dd,"room_door","wall").value=C.i16((C.i32((C.i32((C.i32((1|2))|4))|8)))));
    /* speeds things up in the below loop */
    if(Number(C.i32(C.field(dd,"room_door","mask").value)==C.i32((-1)))) {
        /* is it a locked door, closed, or a doorway? */
        if(Number(!(C.field(dd,"room_door","secret").value))) {
            if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1728,(C.literal("create_door"))),C.rn2(3))):C.rn2(3)))))) {
                if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1729,(C.literal("create_door"))),C.rn2(5))):C.rn2(5)))))) (C.field(dd,"room_door","mask").value=C.i16(2));
 else if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1731,(C.literal("create_door"))),C.rn2(6))):C.rn2(6)))))) (C.field(dd,"room_door","mask").value=C.i16(8));
 else (C.field(dd,"room_door","mask").value=C.i16(4));
                if(Number(!!(Number(C.i32(C.field(dd,"room_door","mask").value)!=2)&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1735,(C.literal("create_door"))),C.rn2(25))):C.rn2(25)))))))) (()=>{const slot=C.field(dd,"room_door","mask");const old=slot.value;const next=C.i16(C.i32(C.i32(old)|16));slot.value=next;return next;})();
            } else (C.field(dd,"room_door","mask").value=C.i16(0));
        } else {
            if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1740,(C.literal("create_door"))),C.rn2(5))):C.rn2(5)))))) (C.field(dd,"room_door","mask").value=C.i16(8));
 else (C.field(dd,"room_door","mask").value=C.i16(4));
            if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1745,(C.literal("create_door"))),C.rn2(20))):C.rn2(20)))))) (()=>{const slot=C.field(dd,"room_door","mask");const old=slot.value;const next=C.i16(C.i32(C.i32(old)|16));slot.value=next;return next;})();
        }
    }
    for((trycnt=0);Number(trycnt<100);(()=>{const old=trycnt;const next=C.i32((old+1));trycnt=next;return next;})()) {
        let dwall=C.i32(C.field(dd,"room_door","wall").value); let dpos=C.i32(C.field(dd,"room_door","pos").value);
        /* Convert wall and pos into an absolute coordinate! */
        switch(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1754,(C.literal("create_door"))),C.rn2(4))):C.rn2(4)))) {
            case (0):
                if(Number(!((C.i32((dwall&1)))))) continue;
            (y=C.i32((C.i32(C.field(broom,"mkroom","ly").value)-1)));
            (x=C.i32((C.i32(C.field(broom,"mkroom","lx").value)+(((Number(dpos==C.i32((-1))))?((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1759,(C.literal("create_door"))),C.rn2(C.i32((C.i32((1+C.i32(C.field(broom,"mkroom","hx").value)))-C.i32(C.field(broom,"mkroom","lx").value)))))):C.rn2(C.i32((C.i32((1+C.i32(C.field(broom,"mkroom","hx").value)))-C.i32(C.field(broom,"mkroom","lx").value)))))):dpos)))));
            if(Number(!!(Number(!(C.isok(C.i16(x),C.i16(C.i32((y-1))))))||(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((y-1)))*C.sizes["struct rm"]),"rm","typ").value))<C.POOL))))) continue;
            break;
            case (1):
                if(Number(!((C.i32((dwall&2)))))) continue;
            (y=C.i32((C.i32(C.field(broom,"mkroom","hy").value)+1)));
            (x=C.i32((C.i32(C.field(broom,"mkroom","lx").value)+(((Number(dpos==C.i32((-1))))?((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1768,(C.literal("create_door"))),C.rn2(C.i32((C.i32((1+C.i32(C.field(broom,"mkroom","hx").value)))-C.i32(C.field(broom,"mkroom","lx").value)))))):C.rn2(C.i32((C.i32((1+C.i32(C.field(broom,"mkroom","hx").value)))-C.i32(C.field(broom,"mkroom","lx").value)))))):dpos)))));
            if(Number(!!(Number(!(C.isok(C.i16(x),C.i16(C.i32((y+1))))))||(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((y+1)))*C.sizes["struct rm"]),"rm","typ").value))<C.POOL))))) continue;
            break;
            case (2):
                if(Number(!((C.i32((dwall&8)))))) continue;
            (x=C.i32((C.i32(C.field(broom,"mkroom","lx").value)-1)));
            (y=C.i32((C.i32(C.field(broom,"mkroom","ly").value)+(((Number(dpos==C.i32((-1))))?((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1777,(C.literal("create_door"))),C.rn2(C.i32((C.i32((1+C.i32(C.field(broom,"mkroom","hy").value)))-C.i32(C.field(broom,"mkroom","ly").value)))))):C.rn2(C.i32((C.i32((1+C.i32(C.field(broom,"mkroom","hy").value)))-C.i32(C.field(broom,"mkroom","ly").value)))))):dpos)))));
            if(Number(!!(Number(!(C.isok(C.i16(C.i32((x-1))),C.i16(y))))||(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((x-1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))<C.POOL))))) continue;
            break;
            case (3):
                if(Number(!((C.i32((dwall&4)))))) continue;
            (x=C.i32((C.i32(C.field(broom,"mkroom","hx").value)+1)));
            (y=C.i32((C.i32(C.field(broom,"mkroom","ly").value)+(((Number(dpos==C.i32((-1))))?((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1786,(C.literal("create_door"))),C.rn2(C.i32((C.i32((1+C.i32(C.field(broom,"mkroom","hy").value)))-C.i32(C.field(broom,"mkroom","ly").value)))))):C.rn2(C.i32((C.i32((1+C.i32(C.field(broom,"mkroom","hy").value)))-C.i32(C.field(broom,"mkroom","ly").value)))))):dpos)))));
            if(Number(!!(Number(!(C.isok(C.i16(C.i32((x+1))),C.i16(y))))||(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((x+1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))<C.POOL))))) continue;
            break;
            default:
                /*NOTREACHED*/
                break;
        }
        if(C.okdoor(C.i16(x),C.i16(y))) break;
    }
    if(Number(trycnt>=100)) {
        C.variadic(6,C.literal("create_door: Can't find a proper place!"));
        return;
    }
    if(Number(!(C.set_levltyp(C.i16(x),C.i16(y),C.i8(((C.i32(C.field(dd,"room_door","secret").value)?C.SDOOR:C.DOOR))))))) return;
    (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value=C.u32(C.field(dd,"room_door","mask").value));
}

/*
 * Create a trap in a room.
 */
export function create_trap(t,croom)
{
    const stackFrame=C.stackSave();
    try {
    let xAddress=C.stackAlloc(2); C.cell(xAddress,"short").value=C.i16(C.i32((-1))); let yAddress=C.stackAlloc(2); C.cell(yAddress,"short").value=C.i16(C.i32((-1)));
    let tm=C.stackAlloc(C.sizes["struct nhcoord"]);
    let mktrap_flags=2;
    if(Number(C.i32(C.field(t,"spltrap","type").value)==C.VIBRATING_SQUARE)) {
        C.pick_vibrasquare_location();
        C.maketrap(C.field(C.field(C.svi,"instance_globals_saved_i","inv_pos").address,"nhcoord","x").value,C.field(C.field(C.svi,"instance_globals_saved_i","inv_pos").address,"nhcoord","y").value,C.VIBRATING_SQUARE);
        return;
    } else if(croom) {
        get_free_room_loc(xAddress,yAddress,croom,C.field(t,"spltrap","coord").value);
    } else {
        let trycnt=0;
        do {
            get_location_coord(xAddress,yAddress,1,croom,C.field(t,"spltrap","coord").value);
        } while(Number(!!((Number(!!(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"short").value)*C.sizes["struct rm"]),"rm","typ").value)==C.STAIRS)||Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"short").value)*C.sizes["struct rm"]),"rm","typ").value)==C.LADDER))))&&Number((()=>{const old=trycnt;const next=C.i32((old+1));trycnt=next;return next;})()<=100))));
        if(Number(trycnt>100)) return;
    }
    if(Number(!(C.field(t,"spltrap","spider_on_web").value))) (()=>{const old=mktrap_flags;const next=C.u32(C.u32(C.u32(old)|4));mktrap_flags=next;return next;})();
    if(C.field(t,"spltrap","seen").value) (()=>{const old=mktrap_flags;const next=C.u32(C.u32(C.u32(old)|1));mktrap_flags=next;return next;})();
    if(C.field(t,"spltrap","novictim").value) (()=>{const old=mktrap_flags;const next=C.u32(C.u32(C.u32(old)|8));mktrap_flags=next;return next;})();
    (C.field(tm,"nhcoord","x").value=C.cell(xAddress,"short").value);
    (C.field(tm,"nhcoord","y").value=C.cell(yAddress,"short").value);
    C.mktrap(C.i32(C.field(t,"spltrap","type").value),mktrap_flags,0,tm);
    } finally {C.stackRestore(stackFrame); }
}

/*
 * Create a monster in a room.
 */
export function noncoalignment(alignment)
{
    alignment=C.i8(alignment);
    let k;
    (k=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1856,(C.literal("noncoalignment"))),C.rn2(2))):C.rn2(2))));
    if(Number(!(alignment))) return ((k?C.i32((-1)):1));
    return ((k?C.i32((-C.i32(alignment))):0));
}

/* attempt to screen out locations where a mimic-as-boulder shouldn't occur */
export function m_bad_boulder_spot(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let lev;
    /* avoid trap locations */
    if(C.t_at(x,y)) return (C.i8(1));
    /* try to avoid locations which already have a boulder (this won't
       actually work; we get called before objects have been placed...) */
    if(C.sobj_at(C.BOULDER,x,y)) return (C.i8(1));
    /* avoid closed doors */
    (lev=((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]));
    if(Number(!!((Number(C.i32((C.field(lev,"rm","typ").value))==C.DOOR))&&Number((C.i32((C.i32(C.field(lev,"rm","flags").value)&(C.i32((4|8))))))!=0)))) return (C.i8(1));
    /* spot is ok */
    return (C.i8(0));
}

export function pm_to_humidity(pm)
{
    let loc=1;
    if(Number(!(pm))) return loc;
    if(Number(!!(Number(!!(Number(C.i32(C.field(pm,"permonst","mlet").value)==C.S_EEL)||(Number((C.u64((C.field((pm),"permonst","mflags1").value&C.u64(512n))))!=C.u64(0n)))))||(Number((C.u64((C.field((pm),"permonst","mflags1").value&C.u64(2n))))!=C.u64(0n)))))) (loc=2);
    if(Number(!!((Number((C.u64((C.field((pm),"permonst","mflags1").value&C.u64(1n))))!=C.u64(0n)))||(Number(!!(Number(C.i32(C.field((pm),"permonst","mlet").value)==C.S_EYE)||Number(C.i32(C.field((pm),"permonst","mlet").value)==C.S_LIGHT))))))) (()=>{const old=loc;const next=C.i32(C.i32(C.i32(old)|(C.i32((4|2)))));loc=next;return next;})();
    if(Number(!!((Number((C.u64((C.field((pm),"permonst","mflags1").value&C.u64(8n))))!=C.u64(0n)))||(Number(C.i32(C.field((pm),"permonst","mlet").value)==C.S_GHOST))))) (()=>{const old=loc;const next=C.i32(C.i32(C.i32(old)|8));loc=next;return next;})();
    if((Number(!!(Number(!!(Number((pm)==(C.mons+Number(C.PM_FIRE_VORTEX)*C.sizes["struct permonst"]))||Number((pm)==(C.mons+Number(C.PM_FLAMING_SPHERE)*C.sizes["struct permonst"]))))||(Number(!!(Number(pm==(C.mons+Number(C.PM_FIRE_ELEMENTAL)*C.sizes["struct permonst"]))||Number(pm==(C.mons+Number(C.PM_SALAMANDER)*C.sizes["struct permonst"]))))))))) (()=>{const old=loc;const next=C.i32(C.i32(C.i32(old)|4));loc=next;return next;})();
    return loc;
}

/*
 * Convert a special level alignment mask (an alignment mask with possible
 * extra values/flags) to a "normal" alignment mask (no extra flags).
 *
 * When random: there is an 80% chance that the altar will be co-aligned.
 */
export function sp_amask_to_amask(sp_amask)
{
    sp_amask=C.u32(sp_amask);
    let amask;
    if(Number(sp_amask==C.u32(32))) (amask=(C.u32((((Number(C.i32((C.cell((C.field(C.u,"you","ualignbase").address+Number(1)*1),"signed char").value))==(C.i32((-128)))))?0:((Number(C.i32((C.cell((C.field(C.u,"you","ualignbase").address+Number(1)*1),"signed char").value))==1))?4:(C.i32((C.i32((C.cell((C.field(C.u,"you","ualignbase").address+Number(1)*1),"signed char").value))+2)))))))));
 else if(Number(sp_amask==C.u32(64))) (amask=(C.u32((((Number((noncoalignment(C.cell((C.field(C.u,"you","ualignbase").address+Number(1)*1),"signed char").value))==(C.i32((-128)))))?0:((Number((noncoalignment(C.cell((C.field(C.u,"you","ualignbase").address+Number(1)*1),"signed char").value))==1))?4:(C.i32(((noncoalignment(C.cell((C.field(C.u,"you","ualignbase").address+Number(1)*1),"signed char").value))+2)))))))));
 else if(Number(sp_amask==C.u32(128))) (amask=C.induced_align(80));
 else (amask=C.u32((sp_amask&C.u32(7))));
    return amask;
}

export function create_monster(m,croom)
{
    const stackFrame=C.stackSave();
    try {
    let mtmp;
    let xAddress=C.stackAlloc(2); let yAddress=C.stackAlloc(2);
    let class_;
    let amask;
    let cc=C.stackAlloc(C.sizes["struct nhcoord"]);
    let pm;
    let g_mvflags;
    if(Number(C.i32(C.field(m,"monster","class").value)>=0)) (class_=C.i8(C.def_char_to_monclass(C.i8(C.field(m,"monster","class").value))));
 else (class_=C.i8(0));
    if(Number(C.i32(class_)==C.MAXMCLASSES)) C.variadic(7,C.literal("create_monster: unknown monster class '%c'"),C.i32(C.field(m,"monster","class").value));
    (amask=sp_amask_to_amask(C.field(m,"monster","sp_amask").value));
    if(Number(!(class_))) {
        (pm=0);
    } else if(Number(C.i32(C.field(m,"monster","id").value)!=C.NON_PM)) {
        (pm=(C.mons+Number(C.field(m,"monster","id").value)*C.sizes["struct permonst"]));
        (g_mvflags=C.u32(C.field((C.field(C.svm,"instance_globals_saved_m","mvitals").address+Number((C.field((pm),"permonst","pmidx").value))*C.sizes["struct mvitals"]),"mvitals","mvflags").value));
        if(Number(!!((C.i32((C.i32(C.field(pm,"permonst","geno").value)&4096)))&&(C.u32((g_mvflags&C.u32(1))))))) return;
        if(C.u32((g_mvflags&C.u32((C.i32((2|1))))))) (pm=0);
        /* genocided or extinct */
        /* make random monster */
    } else {
        (pm=C.mkclass(class_,512));
        /* if we can't get a specific monster type (pm == 0) then the
           class has been genocided, so settle for a random monster */
    }
    if(Number(!!(Number(!!(Number(!!(Number(!!(C.i32(C.In_mines(C.field(C.u,"you","uz").address))&&pm))&&(Number((C.u64((C.field((pm),"permonst","mflags2").value&C.u64(C.field(C.field(C.gu,"instance_globals_u","urace").address,"Race","selfmask").value))))!=C.u64(0n)))))&&(Number(!!((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urace").address,"Race","mnum").value)==(C.PM_DWARF)))||(Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urace").address,"Race","mnum").value)==(C.PM_GNOME))))))))&&((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),1960,(C.literal("create_monster"))),C.rn2(3))):C.rn2(3)))))) (pm=0);
    if(pm) {
        let loc=pm_to_humidity(pm);
        /* If water-liking monster, first try is without DRY */
        get_location_coord(xAddress,yAddress,C.i32((loc|32)),croom,C.field(m,"monster","coord").value);
        if(Number(!!(Number(C.i32(C.cell(xAddress,"short").value)==C.i32((-1)))&&Number(C.i32(C.cell(yAddress,"short").value)==C.i32((-1)))))) {
            (()=>{const old=loc;const next=C.i32(C.i32(C.i32(old)|1));loc=next;return next;})();
            get_location_coord(xAddress,yAddress,loc,croom,C.field(m,"monster","coord").value);
        }
    } else {
        get_location_coord(xAddress,yAddress,1,croom,C.field(m,"monster","coord").value);
    }
    /* try to find a close place if someone else is already there */
    if(Number(!!((Number(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(C.cell(xAddress,"short").value)*(8*21))+Number(C.cell(yAddress,"short").value)*8),"struct monst *").value!=0))&&C.i32(C.enexto(cc,C.cell(xAddress,"short").value,C.cell(yAddress,"short").value,pm))))) ((C.cell(xAddress,"short").value=C.field(cc,"nhcoord","x").value),(C.cell(yAddress,"short").value=C.field(cc,"nhcoord","y").value));
    if(Number(!!(croom&&Number(!(C.inside_room(croom,C.cell(xAddress,"short").value,C.cell(yAddress,"short").value)))))) return;
    if(Number(C.field(m,"monster","sp_amask").value!=C.u32(128))) (mtmp=C.mk_roamer(pm,(C.i8((((Number((C.u32(((amask)&C.u32(7))))==C.u32(0)))?(C.i32((-128))):((Number((C.u32(((amask)&C.u32(7))))==C.u32(4)))?1:C.i32(((C.i32((C.u32(((amask)&C.u32(7))))))-2))))))),C.cell(xAddress,"short").value,C.cell(yAddress,"short").value,C.field(m,"monster","peaceful").value));
 else if(Number(!!(Number(C.PM_ARCHEOLOGIST<=C.i32(C.field(m,"monster","id").value))&&Number(C.i32(C.field(m,"monster","id").value)<=C.PM_WIZARD)))) (mtmp=C.mk_mplayer(pm,C.cell(xAddress,"short").value,C.cell(yAddress,"short").value,(C.i8(0))));
 else (mtmp=C.makemon(pm,C.cell(xAddress,"short").value,C.cell(yAddress,"short").value,C.field(m,"monster","mm_flags").value));
    if(mtmp) {
        ((C.cell(xAddress,"short").value=C.field(mtmp,"monst","mx").value),(C.cell(yAddress,"short").value=C.field(mtmp,"monst","my").value));
        /* sanity precaution */
        ((C.field(m,"monster","x").value=C.cell(xAddress,"short").value),(C.field(m,"monster","y").value=C.cell(yAddress,"short").value));
        /* handle specific attributes for some special monsters */
        if(C.field(C.field(m,"monster","name").address,"str_or_len","str").value) (mtmp=C.christen_monst(mtmp,C.field(C.field(m,"monster","name").address,"str_or_len","str").value));
        /*
         * This doesn't complain if an attempt is made to give a
         * non-mimic/non-shapechanger an appearance or to give a
         * shapechanger a non-monster shape, it just refuses to comply.
         */
        if(Number(!!(Number(!!(C.field(C.field(m,"monster","appear_as").address,"str_or_len","str").value&&(Number(!!((Number(C.i32(C.field(C.field(mtmp,"monst","data").value,"permonst","mlet").value)==C.S_MIMIC))||(Number(!!((Number(!!(Number(C.i32((C.field(mtmp,"monst","cham").value))>=C.LOW_PM)&&Number(C.i32((C.field(mtmp,"monst","cham").value))<C.NUMMONS))))&&Number(C.i32(C.field(m,"monster","appear").value)==C.M_AP_MONSTER)))))))))&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.PROT_FROM_SHAPE_CHANGERS)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.PROT_FROM_SHAPE_CHANGERS)*C.sizes["struct prop"]),"prop","extrinsic").value)))))))) {
            /* shapechanger (chameleons, et al, and vampires) */
            let i;
            switch(C.i32(C.field(m,"monster","appear").value)) {
                case (C.M_AP_NOTHING):
                    C.variadic(8,C.literal("create_monster: mon has an appearance, \"%s\", but no type"),C.field(C.field(m,"monster","appear_as").address,"str_or_len","str").value);
                break;
                case (C.M_AP_FURNITURE):
                    for((i=0);Number(i<C.MAXPCHARS);(()=>{const old=i;const next=C.i32((old+1));i=next;return old;})()) if(Number(!(C.strcmp(C.field((C.defsyms+Number(i)*C.sizes["struct symdef"]),"symdef","explanation").value,C.field(C.field(m,"monster","appear_as").address,"str_or_len","str").value)))) break;

                if(Number(i==C.MAXPCHARS)) {
                    C.variadic(9,C.literal("create_monster: can't find feature \"%s\""),C.field(C.field(m,"monster","appear_as").address,"str_or_len","str").value);
                } else {
                    (C.field(mtmp,"monst","m_ap_type").value=C.u8(C.M_AP_FURNITURE));
                    (C.field(mtmp,"monst","mappearance").value=C.u32(i));
                }
                break;
                case (C.M_AP_OBJECT):
                    for((i=0);Number(i<C.NUM_OBJECTS);(()=>{const old=i;const next=C.i32((old+1));i=next;return old;})()) if(Number(!!((C.field((C.obj_descr+Number(C.field((C.objects+Number(i)*C.sizes["struct objclass"]),"objclass","oc_name_idx").value)*C.sizes["struct objdescr"]),"objdescr","oc_name").value)&&Number(!(C.strcmp((C.field((C.obj_descr+Number(C.field((C.objects+Number(i)*C.sizes["struct objclass"]),"objclass","oc_name_idx").value)*C.sizes["struct objdescr"]),"objdescr","oc_name").value),C.field(C.field(m,"monster","appear_as").address,"str_or_len","str").value)))))) break;

                if(Number(i==C.NUM_OBJECTS)) {
                    C.variadic(10,C.literal("create_monster: can't find object \"%s\""),C.field(C.field(m,"monster","appear_as").address,"str_or_len","str").value);
                } else {
                    (C.field(mtmp,"monst","m_ap_type").value=C.u8(C.M_AP_OBJECT));
                    (C.field(mtmp,"monst","mappearance").value=C.u32(i));
                    /* try to avoid placing mimic boulder on a trap */
                    if(Number(!!(Number(!!(Number(i==C.BOULDER)&&Number(C.i32(C.field(m,"monster","x").value)<0)))&&C.i32(m_bad_boulder_spot(C.cell(xAddress,"short").value,C.cell(yAddress,"short").value))))) {
                        let retrylimit=10;
                        (C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(C.cell(xAddress,"short").value)*(8*21))+Number(C.cell(yAddress,"short").value)*8),"struct monst *").value=0);
                        do {
                            (C.cell(xAddress,"short").value=C.field(m,"monster","x").value);
                            (C.cell(yAddress,"short").value=C.field(m,"monster","y").value);
                            get_location(xAddress,yAddress,C.u32(1),croom);
                            if(Number(!!((Number(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(C.cell(xAddress,"short").value)*(8*21))+Number(C.cell(yAddress,"short").value)*8),"struct monst *").value!=0))&&C.i32(C.enexto(cc,C.cell(xAddress,"short").value,C.cell(yAddress,"short").value,pm))))) ((C.cell(xAddress,"short").value=C.field(cc,"nhcoord","x").value),(C.cell(yAddress,"short").value=C.field(cc,"nhcoord","y").value));
                        } while(Number(!!(C.i32(m_bad_boulder_spot(C.cell(xAddress,"short").value,C.cell(yAddress,"short").value))&&Number((()=>{const old=retrylimit;const next=C.i32((old-1));retrylimit=next;return next;})()>0))));
                        C.place_monster(mtmp,C.cell(xAddress,"short").value,C.cell(yAddress,"short").value);
                        /* if we didn't find a good spot
                           then mimic something else */
                        if(Number(!(retrylimit))) C.set_mimic_sym(mtmp);
                    }
                }
                break;
                case (C.M_AP_MONSTER):
{
                        let mndxAddress=C.stackAlloc(4); let gender_name_varAddress=C.stackAlloc(4); C.cell(gender_name_varAddress,"int").value=C.NEUTRAL;
                        if(Number(!(C.strncmpi((C.field(C.field(m,"monster","appear_as").address,"str_or_len","str").value),(C.literal("random")),C.i32((-1)))))) (C.cell(mndxAddress,"int").value=C.select_newcham_form(mtmp));
 else (C.cell(mndxAddress,"int").value=C.name_to_mon(C.field(C.field(m,"monster","appear_as").address,"str_or_len","str").value,gender_name_varAddress));
                        if(Number(!!(Number(C.cell(mndxAddress,"int").value==C.NON_PM)||(Number(!!((Number(!!(Number(!!(Number(C.i32(C.field((mtmp),"monst","cham").value)==C.PM_VAMPIRE)||Number(C.i32(C.field((mtmp),"monst","cham").value)==C.PM_VAMPIRE_LEADER)))||Number(C.i32(C.field((mtmp),"monst","cham").value)==C.PM_VLAD_THE_IMPALER))))&&Number(!(C.validvamp(mtmp,mndxAddress,C.S_HUMAN))))))))) {
                            C.variadic(11,C.literal("create_monster: invalid %s (\"%s\")"),((Number(C.i32(C.field(C.field(mtmp,"monst","data").value,"permonst","mlet").value)==C.S_MIMIC))?C.literal("mimic appearance"):((Number(C.field(mtmp,"monst","data").value==(C.mons+Number(C.PM_WIZARD_OF_YENDOR)*C.sizes["struct permonst"])))?C.literal("Wizard appearance"):((Number(!!(Number(!!(Number(C.i32(C.field((mtmp),"monst","cham").value)==C.PM_VAMPIRE)||Number(C.i32(C.field((mtmp),"monst","cham").value)==C.PM_VAMPIRE_LEADER)))||Number(C.i32(C.field((mtmp),"monst","cham").value)==C.PM_VLAD_THE_IMPALER))))?C.literal("vampire shape"):C.literal("chameleon shape")))),C.field(C.field(m,"monster","appear_as").address,"str_or_len","str").value);
                        } else if(Number((C.mons+Number(C.cell(mndxAddress,"int").value)*C.sizes["struct permonst"])==C.field(mtmp,"monst","data").value)) {
                            /* explicitly forcing a mimic to appear as itself */
                            (C.field(mtmp,"monst","m_ap_type").value=C.u8(C.M_AP_NOTHING));
                            (C.field(mtmp,"monst","mappearance").value=C.u32(0));
                        } else if(Number(!!(Number(C.i32(C.field(C.field(mtmp,"monst","data").value,"permonst","mlet").value)==C.S_MIMIC)||Number(C.field(mtmp,"monst","data").value==(C.mons+Number(C.PM_WIZARD_OF_YENDOR)*C.sizes["struct permonst"]))))) {
                            /* this is ordinarily only used for Wizard clones
                       and hasn't been exhaustively tested for mimics */
                            (C.field(mtmp,"monst","m_ap_type").value=C.u8(C.M_AP_MONSTER));
                            (C.field(mtmp,"monst","mappearance").value=C.u32(C.cell(mndxAddress,"int").value));
                        } else {
                            /* chameleon or vampire */
                            let mdat=(C.mons+Number(C.cell(mndxAddress,"int").value)*C.sizes["struct permonst"]);
                            let olddata=C.field(mtmp,"monst","data").value;
                            C.mgender_from_permonst(mtmp,mdat);
                            if(Number(C.cell(gender_name_varAddress,"int").value!=C.NEUTRAL)) (C.field(mtmp,"monst","female").value=C.u32(C.cell(gender_name_varAddress,"int").value));
                            C.set_mon_data(mtmp,mdat);
                            if(Number((((Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field((olddata),"permonst","mlet").value)==C.S_LIGHT)||Number((olddata)==(C.mons+Number(C.PM_FLAMING_SPHERE)*C.sizes["struct permonst"]))))||Number((olddata)==(C.mons+Number(C.PM_SHOCKING_SPHERE)*C.sizes["struct permonst"]))))||Number((olddata)==(C.mons+Number(C.PM_BABY_GOLD_DRAGON)*C.sizes["struct permonst"]))))||Number((olddata)==(C.mons+Number(C.PM_FIRE_VORTEX)*C.sizes["struct permonst"])))))?1:((Number(!!(Number((olddata)==(C.mons+Number(C.PM_FIRE_ELEMENTAL)*C.sizes["struct permonst"]))||Number((olddata)==(C.mons+Number(C.PM_GOLD_DRAGON)*C.sizes["struct permonst"])))))?1:0)))!=(((Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field((C.field(mtmp,"monst","data").value),"permonst","mlet").value)==C.S_LIGHT)||Number((C.field(mtmp,"monst","data").value)==(C.mons+Number(C.PM_FLAMING_SPHERE)*C.sizes["struct permonst"]))))||Number((C.field(mtmp,"monst","data").value)==(C.mons+Number(C.PM_SHOCKING_SPHERE)*C.sizes["struct permonst"]))))||Number((C.field(mtmp,"monst","data").value)==(C.mons+Number(C.PM_BABY_GOLD_DRAGON)*C.sizes["struct permonst"]))))||Number((C.field(mtmp,"monst","data").value)==(C.mons+Number(C.PM_FIRE_VORTEX)*C.sizes["struct permonst"])))))?1:((Number(!!(Number((C.field(mtmp,"monst","data").value)==(C.mons+Number(C.PM_FIRE_ELEMENTAL)*C.sizes["struct permonst"]))||Number((C.field(mtmp,"monst","data").value)==(C.mons+Number(C.PM_GOLD_DRAGON)*C.sizes["struct permonst"])))))?1:0))))) {
                                /* used to give light, now doesn't, or vice versa,
                           or light's range has changed */
                                if((((Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field((olddata),"permonst","mlet").value)==C.S_LIGHT)||Number((olddata)==(C.mons+Number(C.PM_FLAMING_SPHERE)*C.sizes["struct permonst"]))))||Number((olddata)==(C.mons+Number(C.PM_SHOCKING_SPHERE)*C.sizes["struct permonst"]))))||Number((olddata)==(C.mons+Number(C.PM_BABY_GOLD_DRAGON)*C.sizes["struct permonst"]))))||Number((olddata)==(C.mons+Number(C.PM_FIRE_VORTEX)*C.sizes["struct permonst"])))))?1:((Number(!!(Number((olddata)==(C.mons+Number(C.PM_FIRE_ELEMENTAL)*C.sizes["struct permonst"]))||Number((olddata)==(C.mons+Number(C.PM_GOLD_DRAGON)*C.sizes["struct permonst"])))))?1:0)))) C.del_light_source(C.LS_MONSTER,C.monst_to_any(mtmp));
                                if((((Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field((C.field(mtmp,"monst","data").value),"permonst","mlet").value)==C.S_LIGHT)||Number((C.field(mtmp,"monst","data").value)==(C.mons+Number(C.PM_FLAMING_SPHERE)*C.sizes["struct permonst"]))))||Number((C.field(mtmp,"monst","data").value)==(C.mons+Number(C.PM_SHOCKING_SPHERE)*C.sizes["struct permonst"]))))||Number((C.field(mtmp,"monst","data").value)==(C.mons+Number(C.PM_BABY_GOLD_DRAGON)*C.sizes["struct permonst"]))))||Number((C.field(mtmp,"monst","data").value)==(C.mons+Number(C.PM_FIRE_VORTEX)*C.sizes["struct permonst"])))))?1:((Number(!!(Number((C.field(mtmp,"monst","data").value)==(C.mons+Number(C.PM_FIRE_ELEMENTAL)*C.sizes["struct permonst"]))||Number((C.field(mtmp,"monst","data").value)==(C.mons+Number(C.PM_GOLD_DRAGON)*C.sizes["struct permonst"])))))?1:0)))) C.new_light_source(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value,(((Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field((C.field(mtmp,"monst","data").value),"permonst","mlet").value)==C.S_LIGHT)||Number((C.field(mtmp,"monst","data").value)==(C.mons+Number(C.PM_FLAMING_SPHERE)*C.sizes["struct permonst"]))))||Number((C.field(mtmp,"monst","data").value)==(C.mons+Number(C.PM_SHOCKING_SPHERE)*C.sizes["struct permonst"]))))||Number((C.field(mtmp,"monst","data").value)==(C.mons+Number(C.PM_BABY_GOLD_DRAGON)*C.sizes["struct permonst"]))))||Number((C.field(mtmp,"monst","data").value)==(C.mons+Number(C.PM_FIRE_VORTEX)*C.sizes["struct permonst"])))))?1:((Number(!!(Number((C.field(mtmp,"monst","data").value)==(C.mons+Number(C.PM_FIRE_ELEMENTAL)*C.sizes["struct permonst"]))||Number((C.field(mtmp,"monst","data").value)==(C.mons+Number(C.PM_GOLD_DRAGON)*C.sizes["struct permonst"])))))?1:0))),C.LS_MONSTER,C.monst_to_any(mtmp));
                            }
                            if(Number(!!(Number(!(C.field(mtmp,"monst","perminvis").value))||(Number(!!(Number((olddata)==(C.mons+Number(C.PM_STALKER)*C.sizes["struct permonst"]))||Number((olddata)==(C.mons+Number(C.PM_BLACK_LIGHT)*C.sizes["struct permonst"])))))))) (C.field(mtmp,"monst","perminvis").value=C.u32((Number(!!(Number((mdat)==(C.mons+Number(C.PM_STALKER)*C.sizes["struct permonst"]))||Number((mdat)==(C.mons+Number(C.PM_BLACK_LIGHT)*C.sizes["struct permonst"])))))));
                        }
                        break;
                    }                default:
                    C.variadic(12,C.literal("create_monster: unimplemented mon appear type [%d,\"%s\"]"),C.i32(C.field(m,"monster","appear").value),C.field(C.field(m,"monster","appear_as").address,"str_or_len","str").value);
                break;
            }
            if(C.does_block(C.i32(C.cell(xAddress,"short").value),C.i32(C.cell(yAddress,"short").value),((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"short").value)*C.sizes["struct rm"]))) C.block_point(C.i32(C.cell(xAddress,"short").value),C.i32(C.cell(yAddress,"short").value));
        }
        (C.field(mtmp,"monst","female").value=C.u32(C.field(m,"monster","female").value));
        if(Number(C.i32(C.field(m,"monster","peaceful").value)>(C.i32((-1))))) {
            (C.field(mtmp,"monst","mpeaceful").value=C.u32(C.field(m,"monster","peaceful").value));
            /* changed mpeaceful again; have to reset malign */
            C.set_malign(mtmp);
        }
        if(Number(C.i32(C.field(m,"monster","asleep").value)>(C.i32((-1))))) (C.field(mtmp,"monst","msleeping").value=C.u32(C.field(m,"monster","asleep").value));
        if(C.field(m,"monster","seentraps").value) (C.field(mtmp,"monst","mtrapseen").value=C.field(m,"monster","seentraps").value);
        if(C.field(m,"monster","cancelled").value) (C.field(mtmp,"monst","mcan").value=C.u32(1));
        if(C.field(m,"monster","revived").value) (C.field(mtmp,"monst","mrevived").value=C.u32(1));
        if(C.field(m,"monster","avenge").value) (C.field(mtmp,"monst","mavenge").value=C.u32(1));
        if(C.field(m,"monster","stunned").value) (C.field(mtmp,"monst","mstun").value=C.u32(1));
        if(C.field(m,"monster","confused").value) (C.field(mtmp,"monst","mconf").value=C.u32(1));
        if(C.field(m,"monster","invis").value) {
            (C.field(mtmp,"monst","minvis").value=(C.field(mtmp,"monst","perminvis").value=C.u32(1)));
        }
        if(C.field(m,"monster","blinded").value) {
            (C.field(mtmp,"monst","mcansee").value=C.u32(0));
            (C.field(mtmp,"monst","mblinded").value=C.u32((C.i32((C.i32(C.field(m,"monster","blinded").value)%127)))));
        }
        if(C.field(m,"monster","paralyzed").value) {
            (C.field(mtmp,"monst","mcanmove").value=C.u32(0));
            (C.field(mtmp,"monst","mfrozen").value=C.u32((C.i32((C.i32(C.field(m,"monster","paralyzed").value)%127)))));
        }
        if(C.field(m,"monster","fleeing").value) {
            (C.field(mtmp,"monst","mflee").value=C.u32(1));
            (C.field(mtmp,"monst","mfleetim").value=C.u32((C.i32((C.i32(C.field(m,"monster","fleeing").value)%127)))));
        }
        if(C.field(m,"monster","waiting").value) {
            (()=>{const slot=C.field(mtmp,"monst","mstrategy");const old=slot.value;const next=C.u64(C.u64(C.u64(old)|C.u64(536870912n)));slot.value=next;return next;})();
            /* if this is a vampire that got created already shifted into
               bat/fog/wolf form and the special level or theme room didn't
               explicitly request that, shift back to vampire */
            if(Number(!!((Number(!!((Number(!!(Number(!!(Number(C.i32(C.field(((mtmp)),"monst","cham").value)==C.PM_VAMPIRE)||Number(C.i32(C.field(((mtmp)),"monst","cham").value)==C.PM_VAMPIRE_LEADER)))||Number(C.i32(C.field(((mtmp)),"monst","cham").value)==C.PM_VLAD_THE_IMPALER))))&&Number(!((Number(C.i32(C.field((C.field((mtmp),"monst","data").value),"permonst","mlet").value)==C.S_VAMPIRE)))))))&&Number(C.i32(C.field(m,"monster","appear").value)!=C.M_AP_MONSTER)))) C.newcham(mtmp,(C.mons+Number(C.field(mtmp,"monst","cham").value)*C.sizes["struct permonst"]),0);
        }
        if(C.field(m,"monster","m_lev_adj").value) {
            if(Number(C.i32((C.i32(C.field(mtmp,"monst","m_lev").value)+C.i32(C.field(m,"monster","m_lev_adj").value)))>49)) (C.field(mtmp,"monst","m_lev").value=C.u8(49));
 else if(Number(C.i32((C.i32(C.field(mtmp,"monst","m_lev").value)+C.i32(C.field(m,"monster","m_lev_adj").value)))<0)) (C.field(mtmp,"monst","m_lev").value=C.u8(0));
 else (()=>{const slot=C.field(mtmp,"monst","m_lev");const old=slot.value;const next=C.u8(C.i32(C.i32(old)+C.i32(C.field(m,"monster","m_lev_adj").value)));slot.value=next;return next;})();
        }
        if(Number(!((C.i32((C.i32(C.field(m,"monster","has_invent").value)&2)))))) {
            /* guard against someone accidentally specifying e.g. quest nemesis
             * with custom inventory that lacks Bell or quest artifact but
             * forgetting to flag them as receiving their default inventory */
            C.mdrop_special_objs(mtmp);
            C.discard_minvent(mtmp,(C.i8(1)));
        }
        if(C.i32((C.i32(C.field(m,"monster","has_invent").value)&1))) {
            (C.cell(C.invent_carrying_monster,"struct monst *").value=mtmp);
        }
    }
    } finally {C.stackRestore(stackFrame); }
}

/*
 * Create an object in a room.
 */
export function create_object(o,croom)
{
    const stackFrame=C.stackSave();
    try {
    let otmp;
    let xAddress=C.stackAlloc(2); let yAddress=C.stackAlloc(2);
    let c;
    let named;
    /* has a name been supplied in level description? */
    (named=C.i8((C.field(C.field(o,"object","name").address,"str_or_len","str").value?C.i32((C.i8(1))):C.i32((C.i8(0))))));
    get_location_coord(xAddress,yAddress,1,croom,C.field(o,"object","coord").value);
    if(Number(C.i32(C.field(o,"object","class").value)>=0)) (c=C.i8(C.field(o,"object","class").value));
 else (c=C.i8(0));
    if(Number(!(c))) {
        (otmp=C.mkobj_at(C.i8(C.RANDOM_CLASS),C.cell(xAddress,"short").value,C.cell(yAddress,"short").value,C.i8(Number(!(named)))));
    } else if(Number(C.i32(C.field(o,"object","id").value)!=C.i32((-1)))) {
        (otmp=C.mksobj_at(C.i32(C.field(o,"object","id").value),C.cell(xAddress,"short").value,C.cell(yAddress,"short").value,(C.i8(1)),C.i8(Number(!(named)))));
    } else {
        /*
         * The special levels are compiled with the default "text" object
         * class characters.  We must convert them to the internal format.
         */
        let oclass=C.i8(C.def_char_to_objclass(c));
        if(Number(C.i32(oclass)==C.MAXOCLASSES)) C.variadic(13,C.literal("create_object:  unexpected object class '%c'"),C.i32(c));
        /* KMH -- Create piles of gold properly */
        if(Number(C.i32(oclass)==C.COIN_CLASS)) (otmp=C.mkgold(0n,C.cell(xAddress,"short").value,C.cell(yAddress,"short").value));
 else (otmp=C.mkobj_at(oclass,C.cell(xAddress,"short").value,C.cell(yAddress,"short").value,C.i8(Number(!(named)))));
    }
    if(Number(C.i32(C.field(o,"object","spe").value)!=C.i32((-127)))) (C.field(otmp,"obj","spe").value=C.i8(C.field(o,"object","spe").value));
    /* That means NOT RANDOM! */
    switch(C.i32(C.field(o,"object","curse_state").value)) {
        case (1):
            /* blessed */
            C.bless(otmp);
        break;
        case (2):
            /* uncursed */
            C.unbless(otmp);
        C.uncurse(otmp);
        break;
        case (3):
            /* cursed */
            C.curse(otmp);
        break;
        case (4):
            /* not cursed */
            C.uncurse(otmp);
        break;
        case (5):
            /* not uncursed */
            C.blessorcurse(otmp,1);
        break;
        case (6):
            /* not blessed */
            C.unbless(otmp);
        break;
        default:
            /* random */
            break;
        /* keep what mkobj gave us */
    }
    /* corpsenm is "empty" if -1, random if -2, otherwise specific */
    if(Number(C.field(o,"object","corpsenm").value!=C.NON_PM)) {
        if(Number(C.field(o,"object","corpsenm").value==C.i32((C.NON_PM-1)))) C.set_corpsenm(otmp,C.rndmonnum());
 else C.set_corpsenm(otmp,C.field(o,"object","corpsenm").value);
    }
    /* set_corpsenm() took care of egg hatch and corpse timers */
    if(named) {
        (otmp=C.oname(otmp,C.field(C.field(o,"object","name").address,"str_or_len","str").value,32));
        if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.SPE_NOVEL)) {
            /* needs to be an existing title */
            C.lookup_novel(C.field(C.field(o,"object","name").address,"str_or_len","str").value,C.field(otmp,"obj","corpsenm").address);
        }
    }
    if(C.field(o,"object","eroded").value) {
        if(Number(C.i32(C.field(o,"object","eroded").value)<0)) {
            (C.field(otmp,"obj","oerodeproof").value=C.u32(1));
        } else {
            (C.field(otmp,"obj","oeroded").value=C.u32((C.i32((C.i32(C.field(o,"object","eroded").value)%4)))));
            (C.field(otmp,"obj","oeroded2").value=C.u32((C.i32(((C.i32((C.i32(C.field(o,"object","eroded").value)>>2)))%4)))));
        }
    } else {
        (C.field(otmp,"obj","oeroded").value=(C.field(otmp,"obj","oeroded2").value=C.u32(0)));
        (C.field(otmp,"obj","oerodeproof").value=C.u32(0));
    }
    if(C.field(o,"object","recharged").value) (C.field(otmp,"obj","recharged").value=C.u32((C.i32((C.i32(C.field(o,"object","recharged").value)%8)))));
    if(Number(!!(Number(C.i32(C.field(o,"object","locked").value)==0)||Number(C.i32(C.field(o,"object","locked").value)==1)))) {
        (C.field(otmp,"obj","olocked").value=C.u32(C.field(o,"object","locked").value));
    } else if(C.field(o,"object","broken").value) {
        (C.field(otmp,"obj","obroken").value=C.u32(1));
        (C.field(otmp,"obj","olocked").value=C.u32(0));
        /* obj generation may set */
    }
    if(Number(!!(Number(C.i32(C.field(o,"object","trapped").value)==0)||Number(C.i32(C.field(o,"object","trapped").value)==1)))) (C.field(otmp,"obj","otrapped").value=C.u32(C.field(o,"object","trapped").value));
    if(Number(!!(C.i32(C.field(o,"object","trapped").value)&&(Number(!!(Number(C.i32(C.field(o,"object","tknown").value)==0)||Number(C.i32(C.field(o,"object","tknown").value)==1))))))) (C.field(otmp,"obj","tknown").value=C.u32(C.field(o,"object","tknown").value));
    (C.field(otmp,"obj","greased").value=C.u32((C.i32(C.field(o,"object","greased").value)?1:0)));
    if(Number(!!(Number(C.field(o,"object","quan").value>0)&&C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_merge").value)))) {
        (C.field(otmp,"obj","quan").value=C.i64(C.field(o,"object","quan").value));
        (C.field(otmp,"obj","owt").value=C.u32(C.weight(otmp)));
    }
    /* contents (of a container or monster's inventory) */
    if(Number(!!(C.i32((C.i32(C.field(o,"object","containment").value)&1))||C.cell(C.invent_carrying_monster,"struct monst *").value))) {
        if(Number(!(C.cell(C.container_idx,"int").value))) {
            if(Number(!(C.cell(C.invent_carrying_monster,"struct monst *").value))) {
                /*impossible("create_object: no container");*/
                /* don't complain, the monster may be gone legally
                   (eg. unique demon already generated)
                   TODO: In the case of unique demon lords, they should
                   get their inventories even when they get generated
                   outside the des-file.  Maybe another data file that
                   determines what inventories monsters get by default?
                 */
                ;
                /* ['otmp' remains on floor] */
            } else {
                C.remove_object(otmp);
                if(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.SADDLE)&&C.i32(C.can_saddle(C.cell(C.invent_carrying_monster,"struct monst *").value))))) C.put_saddle_on_mon(otmp,C.cell(C.invent_carrying_monster,"struct monst *").value);
 else C.mpickobj(C.cell(C.invent_carrying_monster,"struct monst *").value,otmp);
            }
        } else {
            let cobj=C.cell((C.container_obj+Number(C.i32((C.cell(C.container_idx,"int").value-1)))*8),"struct obj *").value;
            C.remove_object(otmp);
            if(cobj) {
                (otmp=C.add_to_container(cobj,otmp));
                (C.field(cobj,"obj","owt").value=C.u32(C.weight(cobj)));
            } else {
                C.obj_extract_self(otmp);
                /* uncreate a random artifact created in a container */
                /* FIXME: it could be intentional rather than random */
                if(C.field(otmp,"obj","oartifact").value) C.artifact_exists(otmp,C.safe_oname(otmp),(C.i8(0)),0);
                /* flags don't matter */
                C.obfree(otmp,0);
                return 0;
            }
        }
    }
    /* container */
    if(C.i32((C.i32(C.field(o,"object","containment").value)&2))) {
        C.delete_contents(otmp);
        if(Number(C.cell(C.container_idx,"int").value<10)) {
            (C.cell((C.container_obj+Number(C.cell(C.container_idx,"int").value)*8),"struct obj *").value=otmp);
            (()=>{const slot=C.cell(C.container_idx,"int");const old=slot.value;const next=C.i32((old+1));slot.value=next;return old;})();
        } else C.variadic(14,C.literal("create_object: too deeply nested containers."));
    }
    /* Medusa level special case: statues are petrified monsters, so they
     * are not stone-resistant and have monster inventory.  They also lack
     * other contents, but that can be specified as an empty container.
     */
    if(Number(!!(Number(!!(Number(C.i32(C.field(o,"object","id").value)==C.STATUE)&&((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_medusa_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_medusa_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_medusa_level").address))))))))&&Number(C.field(o,"object","corpsenm").value==C.NON_PM)))) {
        let was=0;
        let obj;
        let wastyp;
        let i=0;
        /* prevent endless loop in case makemon always fails */
        /* Named random statues are of player types, and aren't stone-
         * resistant (if they were, we'd have to reset the name as well as
         * setting corpsenm).
         */
        for((wastyp=C.field(otmp,"obj","corpsenm").value);Number(i<1000);((()=>{const old=i;const next=C.i32((old+1));i=next;return old;})(),(wastyp=C.rndmonnum()))) {
            /* makemon without rndmonst() might create a group */
            (was=C.makemon((C.mons+Number(wastyp)*C.sizes["struct permonst"]),C.i16(0),C.i16(0),C.u32(C.i64((4n|131072n)))));
            if(was) {
                if(Number(!!(Number(!(C.Resists_Elem(was,C.STONE_RES)))&&Number(!(C.poly_when_stoned((C.mons+Number(wastyp)*C.sizes["struct permonst"]))))))) {
                    C.propagate(wastyp,(C.i8(1)),(C.i8(0)));
                    break;
                }
                C.mongone(was);
                (was=0);
            }
        }
        if(was) {
            C.set_corpsenm(otmp,wastyp);
            while(C.field(was,"monst","minvent").value) {
                (obj=C.field(was,"monst","minvent").value);
                (C.field(obj,"obj","owornmask").value=C.i64(0));
                C.obj_extract_self(obj);
                C.add_to_container(otmp,obj);
            }
            (C.field(otmp,"obj","owt").value=C.u32(C.weight(otmp)));
            C.mongone(was);
        }
    }
    if(C.field(o,"object","achievement").value) {
        const prize_warning=C.staticData("create_object","prize_warning",()=>C.literal("multiple prizes on %s level"));
        if(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_mineend_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_mineend_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_mineend_level").address))))))) {
            if(Number(!(C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","achieveo").address,"achievement_tracking","mines_prize_oid").value))) {
                (C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","achieveo").address,"achievement_tracking","mines_prize_oid").value=C.field(otmp,"obj","o_id").value);
                (C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","achieveo").address,"achievement_tracking","mines_prize_otyp").value=C.field(otmp,"obj","otyp").value);
                /* prevent stacking; cleared when achievement is recorded;
                   will be reset in addinv_core1() */
                (C.field(otmp,"obj","nomerge").value=C.u32(1));
            } else {
                C.variadic(15,prize_warning,C.literal("mines end"));
            }
        } else if(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoend_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoend_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoend_level").address))))))) {
            if(Number(!(C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","achieveo").address,"achievement_tracking","soko_prize_oid").value))) {
                (C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","achieveo").address,"achievement_tracking","soko_prize_oid").value=C.field(otmp,"obj","o_id").value);
                (C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","achieveo").address,"achievement_tracking","soko_prize_otyp").value=C.field(otmp,"obj","otyp").value);
                (C.field(otmp,"obj","nomerge").value=C.u32(1));
                /* redundant; Sokoban prizes don't stack;
                                    * will be reset in addinv_core1() */
            } else {
                C.variadic(16,prize_warning,C.literal("sokoban end"));
            }
        } else if(Number(!(C.field(C.iflags,"instance_flags","lua_testing").value))) {
            let lbuf=C.stackAlloc((1*128));
            C.describe_level(lbuf,C.i32((1|2)));
            C.variadic(17,C.literal("create_object: unknown achievement (%s\"%s\")"),lbuf,C.simpleonames(otmp));
        }
    }
    if(Number(!((C.i32((C.i32(C.field(o,"object","containment").value)&1)))))) {
        C.stackobj(otmp);
        if(C.field(o,"object","lit").value) C.begin_burn(otmp,(C.i8(0)));
        if(C.field(o,"object","buried").value) {
            let deallocedAddress=C.stackAlloc(1);
            C.bury_an_obj(otmp,deallocedAddress);
            if(C.cell(deallocedAddress,"signed char").value) {
                if(C.cell(C.container_idx,"int").value) (C.cell((C.container_obj+Number(C.i32((C.cell(C.container_idx,"int").value-1)))*8),"struct obj *").value=0);
                (otmp=0);
            }
        }
    }
    return otmp;
    } finally {C.stackRestore(stackFrame); }
}

/*
 * Create an altar in a room.
 */
export function create_altar(a,croom)
{
    const stackFrame=C.stackSave();
    try {
    let sproom;
    let xAddress=C.stackAlloc(2); C.cell(xAddress,"short").value=C.i16(C.i32((-1))); let yAddress=C.stackAlloc(2); C.cell(yAddress,"short").value=C.i16(C.i32((-1)));
    let amask;
    let croom_is_temple=(C.i8(1));
    if(croom) {
        get_free_room_loc(xAddress,yAddress,croom,C.field(a,"altar","coord").value);
        if(Number(C.i32(C.field(croom,"mkroom","rtype").value)!=C.TEMPLE)) (croom_is_temple=(C.i8(0)));
    } else {
        get_location_coord(xAddress,yAddress,1,croom,C.field(a,"altar","coord").value);
        if(Number(C.i32(((sproom=C.i8(C.cell(C.in_rooms(C.cell(xAddress,"short").value,C.cell(yAddress,"short").value,C.TEMPLE),"char").value))))!=0)) (croom=(C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(C.i32((C.i32(sproom)-3)))*C.sizes["struct mkroom"]));
 else (croom_is_temple=(C.i8(0)));
    }
    /* check for existing features */
    if(Number(!(C.set_levltyp(C.cell(xAddress,"short").value,C.cell(yAddress,"short").value,C.i8(C.ALTAR))))) return;
    (amask=sp_amask_to_amask(C.field(a,"altar","sp_amask").value));
    (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"short").value)*C.sizes["struct rm"]),"rm","flags").value=amask);
    if(Number(C.i32(C.field(a,"altar","shrine").value)<0)) (C.field(a,"altar","shrine").value=C.i16(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),2474,(C.literal("create_altar"))),C.rn2(2))):C.rn2(2)))));
    /* handle random case */
    if(Number(!!(Number(!(croom_is_temple))||Number(!(C.field(a,"altar","shrine").value))))) return;
    if(C.field(a,"altar","shrine").value) {
        /* Is it a shrine  or sanctum? */
        C.priestini(C.field(C.u,"you","uz").address,croom,C.i32(C.cell(xAddress,"short").value),C.i32(C.cell(yAddress,"short").value),C.i8((Number(C.i32(C.field(a,"altar","shrine").value)>1))));
        (()=>{const slot=C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"short").value)*C.sizes["struct rm"]),"rm","flags");const old=slot.value;const next=C.u32(C.i32(C.i32(old)|8));slot.value=next;return next;})();
        if(Number(C.i32(C.field(a,"altar","shrine").value)==2)) (()=>{const slot=C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"short").value)*C.sizes["struct rm"]),"rm","flags");const old=slot.value;const next=C.u32(C.i32(C.i32(old)|16));slot.value=next;return next;})();
        /* high altar or sanctum */
        (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","has_temple").value=C.u32((C.i8(1))));
    }
    } finally {C.stackRestore(stackFrame); }
}

/*
 * Search for a door in a room on a specified wall.
 */
export function search_door(croom,x,y,wall,cnt)
{
    wall=C.i16(wall);
    cnt=C.i32(cnt);
    let dx; let dy;
    let xx; let yy;
    switch(C.i32(wall)) {
        case (2):
            (dy=0);
        (dx=1);
        (xx=C.i32(C.field(croom,"mkroom","lx").value));
        (yy=C.i32((C.i32(C.field(croom,"mkroom","hy").value)+1)));
        break;
        case (1):
            (dy=0);
        (dx=1);
        (xx=C.i32(C.field(croom,"mkroom","lx").value));
        (yy=C.i32((C.i32(C.field(croom,"mkroom","ly").value)-1)));
        break;
        case (4):
            (dy=1);
        (dx=0);
        (xx=C.i32((C.i32(C.field(croom,"mkroom","hx").value)+1)));
        (yy=C.i32(C.field(croom,"mkroom","ly").value));
        break;
        case (8):
            (dy=1);
        (dx=0);
        (xx=C.i32((C.i32(C.field(croom,"mkroom","lx").value)-1)));
        (yy=C.i32(C.field(croom,"mkroom","ly").value));
        break;
        default:
            C.variadic(18,C.literal("search_door: Bad wall!"));
        /*NOTREACHED*/
    }
    while(Number(!!(Number(xx<=C.i32((C.i32(C.field(croom,"mkroom","hx").value)+1)))&&Number(yy<=C.i32((C.i32(C.field(croom,"mkroom","hy").value)+1)))))) {
        if(Number(!!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(xx)*(C.sizes["struct rm"]*21))+Number(yy)*C.sizes["struct rm"]),"rm","typ").value))==C.DOOR))||Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(xx)*(C.sizes["struct rm"]*21))+Number(yy)*C.sizes["struct rm"]),"rm","typ").value)==C.SDOOR)))) {
            (C.cell(x,"short").value=C.i16(xx));
            (C.cell(y,"short").value=C.i16(yy));
            if(Number((()=>{const old=cnt;const next=C.i32((old-1));cnt=next;return old;})()<=0)) return (C.i8(1));
        }
        (()=>{const old=xx;const next=C.i32(C.i32(C.i32(old)+dx));xx=next;return next;})();
        (()=>{const old=yy;const next=C.i32(C.i32(C.i32(old)+dy));yy=next;return next;})();
    }
    return (C.i8(0));
}

/*
 * Dig a corridor between two points, using terrain ftyp.
 * if nxcor is TRUE, he corridor may be blocked by a boulder,
 * or just end without reaching the destination.
 * if not null, npoints has the number of map locations used
 */
export function dig_corridor(org,dest,npoints,nxcor,ftyp,btyp)
{
    nxcor=C.i8(nxcor);
    ftyp=C.i8(ftyp);
    btyp=C.i8(btyp);
    let dx=0; let dy=0; let dix; let diy; let cct;
    let crm;
    let tx; let ty; let xx; let yy;
    if(npoints) (C.cell(npoints,"int").value=0);
    (xx=C.i32(C.field(org,"nhcoord","x").value));
    (yy=C.i32(C.field(org,"nhcoord","y").value));
    (tx=C.i32(C.field(dest,"nhcoord","x").value));
    (ty=C.i32(C.field(dest,"nhcoord","y").value));
    if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(xx<=0)||Number(yy<=0)))||Number(tx<=0)))||Number(ty<=0)))||Number(xx>C.i32((80-1)))))||Number(tx>C.i32((80-1)))))||Number(yy>C.i32((21-1)))))||Number(ty>C.i32((21-1)))))) {
        do {
            if(C.debugcore(C.literal("sp_lev.c"),(C.i8(1)))) {
                let save_plnmsg=C.field(C.iflags,"instance_flags","last_msg").value;
                C.variadic(19,C.literal("dig_corridor: bad coords <%d,%d> <%d,%d>."),xx,yy,tx,ty);
                (C.field(C.iflags,"instance_flags","last_msg").value=save_plnmsg);
            }
        } while(0);
        return (C.i8(0));
    }
    if(Number(tx>xx)) (dx=1);
 else if(Number(ty>yy)) (dy=1);
 else if(Number(tx<xx)) (dx=C.i32((-1)));
 else (dy=C.i32((-1)));
    (()=>{const old=xx;const next=C.i32(C.i32(C.i32(old)-dx));xx=next;return next;})();
    (()=>{const old=yy;const next=C.i32(C.i32(C.i32(old)-dy));yy=next;return next;})();
    (cct=0);
    while(Number(!!(Number(xx!=tx)||Number(yy!=ty)))) {
        /* loop: dig corridor at [xx,yy] and find new [xx,yy] */
        if(Number(!!(Number((()=>{const old=cct;const next=C.i32((old+1));cct=next;return old;})()>500)||(Number(!!(C.i32(nxcor)&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),2585,(C.literal("dig_corridor"))),C.rn2(35))):C.rn2(35))))))))))) return (C.i8(0));
        (()=>{const old=xx;const next=C.i32(C.i32(C.i32(old)+dx));xx=next;return next;})();
        (()=>{const old=yy;const next=C.i32(C.i32(C.i32(old)+dy));yy=next;return next;})();
        if(Number(!!(Number(!!(Number(!!(Number(xx>=C.i32((80-1)))||Number(xx<=0)))||Number(yy<=0)))||Number(yy>=C.i32((21-1)))))) return (C.i8(0));
        /* impossible */
        (crm=((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(xx)*(C.sizes["struct rm"]*21))+Number(yy)*C.sizes["struct rm"]));
        if(Number(C.i32(C.field(crm,"rm","typ").value)==C.i32(btyp))) {
            if(Number(!!(Number(C.i32(ftyp)==C.CORR)&&C.i32(C.maybe_sdoor(100))))) {
                if(npoints) (()=>{const slot=C.cell(npoints,"int");const old=slot.value;const next=C.i32((old+1));slot.value=next;return old;})();
                (C.field(crm,"rm","typ").value=C.i8(C.SCORR));
            } else {
                if(npoints) (()=>{const slot=C.cell(npoints,"int");const old=slot.value;const next=C.i32((old+1));slot.value=next;return old;})();
                (C.field(crm,"rm","typ").value=ftyp);
                if(Number(!!(C.i32(nxcor)&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),2604,(C.literal("dig_corridor"))),C.rn2(50))):C.rn2(50)))))))) C.mksobj_at(C.BOULDER,C.i16(xx),C.i16(yy),(C.i8(1)),(C.i8(0)));
            }
        } else if(Number(!!(Number(C.i32(C.field(crm,"rm","typ").value)!=C.i32(ftyp))&&Number(C.i32(C.field(crm,"rm","typ").value)!=C.SCORR)))) {
            /* strange ... */
            return (C.i8(0));
        }
        /* find next corridor position */
        (dix=C.abs(C.i32((xx-tx))));
        (diy=C.abs(C.i32((yy-ty))));
        if(Number(!!(Number(!!((Number(dix>diy))&&diy))&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),2616,(C.literal("dig_corridor"))),C.rn2(C.i32((C.i32((dix-diy))+1))))):C.rn2(C.i32((C.i32((dix-diy))+1)))))))))) {
            (dix=0);
        } else if(Number(!!(Number(!!((Number(diy>dix))&&dix))&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),2618,(C.literal("dig_corridor"))),C.rn2(C.i32((C.i32((diy-dix))+1))))):C.rn2(C.i32((C.i32((diy-dix))+1)))))))))) {
            (diy=0);
        }
        /* do we have to change direction ? */
        if(Number(!!(dy&&Number(dix>diy)))) {
            let ddx=((Number(xx>tx))?C.i32((-1)):1);
            (crm=((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((xx+ddx)))*(C.sizes["struct rm"]*21))+Number(yy)*C.sizes["struct rm"]));
            if(Number(!!(Number(!!(Number(C.i32(C.field(crm,"rm","typ").value)==C.i32(btyp))||Number(C.i32(C.field(crm,"rm","typ").value)==C.i32(ftyp))))||Number(C.i32(C.field(crm,"rm","typ").value)==C.SCORR)))) {
                (dx=ddx);
                (dy=0);
                continue;
            }
        } else if(Number(!!(dx&&Number(diy>dix)))) {
            let ddy=((Number(yy>ty))?C.i32((-1)):1);
            (crm=((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(xx)*(C.sizes["struct rm"]*21))+Number(C.i32((yy+ddy)))*C.sizes["struct rm"]));
            if(Number(!!(Number(!!(Number(C.i32(C.field(crm,"rm","typ").value)==C.i32(btyp))||Number(C.i32(C.field(crm,"rm","typ").value)==C.i32(ftyp))))||Number(C.i32(C.field(crm,"rm","typ").value)==C.SCORR)))) {
                (dy=ddy);
                (dx=0);
                continue;
            }
        }
        /* continue straight on? */
        (crm=((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((xx+dx)))*(C.sizes["struct rm"]*21))+Number(C.i32((yy+dy)))*C.sizes["struct rm"]));
        if(Number(!!(Number(!!(Number(C.i32(C.field(crm,"rm","typ").value)==C.i32(btyp))||Number(C.i32(C.field(crm,"rm","typ").value)==C.i32(ftyp))))||Number(C.i32(C.field(crm,"rm","typ").value)==C.SCORR)))) continue;
        /* no, what must we do now?? */
        if(dx) {
            (dx=0);
            (dy=((Number(ty<yy))?C.i32((-1)):1));
        } else {
            (dy=0);
            (dx=((Number(tx<xx))?C.i32((-1)):1));
        }
        (crm=((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((xx+dx)))*(C.sizes["struct rm"]*21))+Number(C.i32((yy+dy)))*C.sizes["struct rm"]));
        if(Number(!!(Number(!!(Number(C.i32(C.field(crm,"rm","typ").value)==C.i32(btyp))||Number(C.i32(C.field(crm,"rm","typ").value)==C.i32(ftyp))))||Number(C.i32(C.field(crm,"rm","typ").value)==C.SCORR)))) continue;
        (dy=C.i32((-dy)));
        (dx=C.i32((-dx)));
    }
    return (C.i8(1));
}

/*
 * Corridors always start from a door. But it can end anywhere...
 * Basically we search for door coordinates or for endpoints coordinates
 * (from a distance).
 */
export function create_corridor(c)
{
    const stackFrame=C.stackSave();
    try {
    let org=C.stackAlloc(C.sizes["struct nhcoord"]); let dest=C.stackAlloc(C.sizes["struct nhcoord"]);
    if(Number(C.i32(C.field(C.field(c,"corridor","src").address,"sp_lev_corridor_end","room").value)==C.i32((-1)))) {
        C.makecorridors();
        /*makecorridors(c->src.door);*/
        return;
    }
    /* Safety railings - if there's ever a case where des.corridor() needs
     * to be called with src/destwall="random", that logic first needs to be
     * implemented in search_door. */
    if(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(C.field(c,"corridor","src").address,"sp_lev_corridor_end","wall").value)==(C.i32((C.i32((C.i32((1|2))|4))|8))))||Number(C.i32(C.field(C.field(c,"corridor","src").address,"sp_lev_corridor_end","wall").value)==C.i32((-1)))))||Number(C.i32(C.field(C.field(c,"corridor","dest").address,"sp_lev_corridor_end","wall").value)==(C.i32((C.i32((C.i32((1|2))|4))|8))))))||Number(C.i32(C.field(C.field(c,"corridor","dest").address,"sp_lev_corridor_end","wall").value)==C.i32((-1)))))) {
        C.variadic(20,C.literal("create_corridor to/from a random wall"));
        return;
    }
    if(Number(!(search_door((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(C.field(C.field(c,"corridor","src").address,"sp_lev_corridor_end","room").value)*C.sizes["struct mkroom"]),C.field(org,"nhcoord","x").address,C.field(org,"nhcoord","y").address,C.field(C.field(c,"corridor","src").address,"sp_lev_corridor_end","wall").value,C.i32(C.field(C.field(c,"corridor","src").address,"sp_lev_corridor_end","door").value))))) return;
    if(Number(C.i32(C.field(C.field(c,"corridor","dest").address,"sp_lev_corridor_end","room").value)!=C.i32((-1)))) {
        if(Number(!(search_door((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(C.field(C.field(c,"corridor","dest").address,"sp_lev_corridor_end","room").value)*C.sizes["struct mkroom"]),C.field(dest,"nhcoord","x").address,C.field(dest,"nhcoord","y").address,C.field(C.field(c,"corridor","dest").address,"sp_lev_corridor_end","wall").value,C.i32(C.field(C.field(c,"corridor","dest").address,"sp_lev_corridor_end","door").value))))) return;
        switch(C.i32(C.field(C.field(c,"corridor","src").address,"sp_lev_corridor_end","wall").value)) {
            case (1):
                (()=>{const slot=C.field(org,"nhcoord","y");const old=slot.value;const next=C.i16((old-1));slot.value=next;return old;})();
            break;
            case (2):
                (()=>{const slot=C.field(org,"nhcoord","y");const old=slot.value;const next=C.i16((old+1));slot.value=next;return old;})();
            break;
            case (8):
                (()=>{const slot=C.field(org,"nhcoord","x");const old=slot.value;const next=C.i16((old-1));slot.value=next;return old;})();
            break;
            case (4):
                (()=>{const slot=C.field(org,"nhcoord","x");const old=slot.value;const next=C.i16((old+1));slot.value=next;return old;})();
            break;
        }
        switch(C.i32(C.field(C.field(c,"corridor","dest").address,"sp_lev_corridor_end","wall").value)) {
            case (1):
                (()=>{const slot=C.field(dest,"nhcoord","y");const old=slot.value;const next=C.i16((old-1));slot.value=next;return old;})();
            break;
            case (2):
                (()=>{const slot=C.field(dest,"nhcoord","y");const old=slot.value;const next=C.i16((old+1));slot.value=next;return old;})();
            break;
            case (8):
                (()=>{const slot=C.field(dest,"nhcoord","x");const old=slot.value;const next=C.i16((old-1));slot.value=next;return old;})();
            break;
            case (4):
                (()=>{const slot=C.field(dest,"nhcoord","x");const old=slot.value;const next=C.i16((old+1));slot.value=next;return old;})();
            break;
        }
        dig_corridor(org,dest,0,(C.i8(0)),C.i8(C.CORR),C.i8(C.STONE));
    }
    } finally {C.stackRestore(stackFrame); }
}

/*
 * Fill a room (shop, zoo, etc...) with appropriate stuff.
 */
export function fill_special_room(croom)
{
    let i;
    if(Number(!(croom))) return;
    /* First recurse into subrooms. We don't want to block an ordinary room
     * with a special subroom from having the subroom filled, or an unfilled
     * outer room preventing a special subroom from being filled. */
    for((i=0);Number(i<C.i32(C.field(croom,"mkroom","nsubrooms").value));(()=>{const old=i;const next=C.i32((old+1));i=next;return next;})()) {
        fill_special_room(C.cell((C.field(croom,"mkroom","sbrooms").address+Number(i)*8),"struct mkroom *").value);
    }
    if(Number(!!(Number(!!(Number(C.i32(C.field(croom,"mkroom","rtype").value)==C.OROOM)||Number(C.i32(C.field(croom,"mkroom","rtype").value)==C.THEMEROOM)))||Number(C.i32(C.field(croom,"mkroom","needfill").value)==0)))) return;
    if(Number(C.i32(C.field(croom,"mkroom","needfill").value)==1)) {
        let x; let y;
        /* Shop ? */
        if(Number(C.i32(C.field(croom,"mkroom","rtype").value)>=C.SHOPBASE)) {
            C.stock_room(C.i32((C.i32(C.field(croom,"mkroom","rtype").value)-C.SHOPBASE)),croom);
            (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","has_shop").value=C.u32((C.i8(1))));
            return;
        }
        switch(C.i32(C.field(croom,"mkroom","rtype").value)) {
            case (C.VAULT):
                for((x=C.i32(C.field(croom,"mkroom","lx").value));Number(x<=C.i32(C.field(croom,"mkroom","hx").value));(()=>{const old=x;const next=C.i32((old+1));x=next;return old;})()) for((y=C.i32(C.field(croom,"mkroom","ly").value));Number(y<=C.i32(C.field(croom,"mkroom","hy").value));(()=>{const old=y;const next=C.i32((old+1));y=next;return old;})()) C.mkgold(C.i64((C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),2763,(C.literal("fill_special_room"))),C.rn2(C.i32((C.abs(C.i32(C.depth(C.field(C.u,"you","uz").address)))*100))))):C.rn2(C.i32((C.abs(C.i32(C.depth(C.field(C.u,"you","uz").address)))*100)))))+(51))))),C.i16(x),C.i16(y));


            break;
            case (C.COURT):
                case (C.ZOO):
                    case (C.BEEHIVE):
                        case (C.ANTHOLE):
                            case (C.COCKNEST):
                                case (C.LEPREHALL):
                                    case (C.MORGUE):
                                        case (C.BARRACKS):
                                            C.fill_zoo(croom);
            break;
        }
    }
    switch(C.i32(C.field(croom,"mkroom","rtype").value)) {
        case (C.VAULT):
            (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","has_vault").value=C.u32((C.i8(1))));
        break;
        case (C.ZOO):
            (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","has_zoo").value=C.u32((C.i8(1))));
        break;
        case (C.COURT):
            (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","has_court").value=C.u32((C.i8(1))));
        break;
        case (C.MORGUE):
            (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","has_morgue").value=C.u32((C.i8(1))));
        break;
        case (C.BEEHIVE):
            (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","has_beehive").value=C.u32((C.i8(1))));
        break;
        case (C.BARRACKS):
            (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","has_barracks").value=C.u32((C.i8(1))));
        break;
        case (C.TEMPLE):
            (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","has_temple").value=C.u32((C.i8(1))));
        break;
        case (C.SWAMP):
            (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","has_swamp").value=C.u32((C.i8(1))));
        break;
    }
}

export function build_room(r,mkr)
{
    let okroom;
    let aroom;
    let rtype=C.i16(((Number(!!(Number(!(C.field(r,"_room","chance").value))||Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),2811,(C.literal("build_room"))),C.rn2(100))):C.rn2(100)))<C.i32(C.field(r,"_room","chance").value)))))?C.i32(C.field(r,"_room","rtype").value):C.OROOM));
    if(mkr) {
        (aroom=(C.field(C.gs,"instance_globals_s","subrooms").value+Number(C.field(C.gn,"instance_globals_n","nsubroom").value)*C.sizes["struct mkroom"]));
        (okroom=create_subroom(mkr,C.field(r,"_room","x").value,C.field(r,"_room","y").value,C.field(r,"_room","w").value,C.field(r,"_room","h").value,rtype,C.field(r,"_room","rlit").value));
    } else {
        (aroom=(C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(C.field(C.svn,"instance_globals_saved_n","nroom").value)*C.sizes["struct mkroom"]));
        (okroom=create_room(C.field(r,"_room","x").value,C.field(r,"_room","y").value,C.field(r,"_room","w").value,C.field(r,"_room","h").value,C.field(r,"_room","xalign").value,C.field(r,"_room","yalign").value,rtype,C.field(r,"_room","rlit").value));
    }
    if(okroom) {
        /* set roomno */
        C.topologize(aroom);
        /* set roomno */
        (C.field(aroom,"mkroom","needfill").value=C.i8(C.field(r,"_room","needfill").value));
        (C.field(aroom,"mkroom","needjoining").value=C.field(r,"_room","joined").value);
        return aroom;
    }
    return 0;
}

/*
 * set lighting in a region that will not become a room.
 */
export function light_region(tmpregion)
{
    let litstate=C.i8((C.i32(C.field(tmpregion,"region","rlit").value)?1:0));
    let hiy=C.i32(C.field(tmpregion,"region","y2").value);
    let x; let y;
    let lev;
    let lowy=C.i32(C.field(tmpregion,"region","y1").value);
    let lowx=C.i32(C.field(tmpregion,"region","x1").value); let hix=C.i32(C.field(tmpregion,"region","x2").value);
    if(litstate) {
        /* adjust region size for walls, but only if lighted */
        (lowx=((Number((C.i32((lowx-1)))>(1))?(C.i32((lowx-1))):(1))));
        (hix=((Number((C.i32((hix+1)))<(C.i32((80-1))))?(C.i32((hix+1))):(C.i32((80-1))))));
        (lowy=((Number((C.i32((lowy-1)))>(0))?(C.i32((lowy-1))):(0))));
        (hiy=((Number((C.i32((hiy+1)))<(C.i32((21-1))))?(C.i32((hiy+1))):(C.i32((21-1))))));
    }
    for((x=lowx);Number(x<=hix);(()=>{const old=x;const next=C.i32((old+1));x=next;return old;})()) {
        (lev=((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(lowy)*C.sizes["struct rm"]));
        for((y=lowy);Number(y<=hiy);(()=>{const old=y;const next=C.i32((old+1));y=next;return old;})()) {
            (C.field(lev,"rm","lit").value=C.u32(((Number(!!(Number(C.i32((C.field(lev,"rm","typ").value))==C.LAVAPOOL)||Number(C.i32((C.field(lev,"rm","typ").value))==C.LAVAWALL))))?1:C.i32(litstate))));
            (()=>{const old=lev;const next=C.ptr((old+Number(C.sizes["struct rm"])));lev=next;return old;})();
        }
    }
}

export function wallify_map(x1,y1,x2,y2)
{
    x1=C.i16(x1);
    y1=C.i16(y1);
    x2=C.i16(x2);
    y2=C.i16(y2);
    let x; let y; let xx; let yy; let lo_xx; let lo_yy; let hi_xx; let hi_yy;
    (y1=C.i16(((Number(C.i32((y1))>(0))?C.i32((y1)):(0)))));
    (x1=C.i16(((Number(C.i32((x1))>(1))?C.i32((x1)):(1)))));
    (y2=C.i16(((Number(C.i32((y2))<(C.i32((21-1))))?C.i32((y2)):(C.i32((21-1)))))));
    (x2=C.i16(((Number(C.i32((x2))<(C.i32((80-1))))?C.i32((x2)):(C.i32((80-1)))))));
    for((y=y1);Number(C.i32(y)<=C.i32(y2));(()=>{const old=y;const next=C.i16((old+1));y=next;return old;})()) {
        (lo_yy=C.i16(((Number(C.i32(y)>0))?C.i32((C.i32(y)-1)):0)));
        (hi_yy=C.i16(((Number(C.i32(y)<C.i32(y2)))?C.i32((C.i32(y)+1)):C.i32(y2))));
        for((x=x1);Number(C.i32(x)<=C.i32(x2));(()=>{const old=x;const next=C.i16((old+1));x=next;return old;})()) {
            if(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)!=C.STONE)) continue;
            (lo_xx=C.i16(((Number(C.i32(x)>1))?C.i32((C.i32(x)-1)):1)));
            (hi_xx=C.i16(((Number(C.i32(x)<C.i32(x2)))?C.i32((C.i32(x)+1)):C.i32(x2))));
            for((yy=lo_yy);Number(C.i32(yy)<=C.i32(hi_yy));(()=>{const old=yy;const next=C.i16((old+1));yy=next;return old;})()) for((xx=lo_xx);Number(C.i32(xx)<=C.i32(hi_xx));(()=>{const old=xx;const next=C.i16((old+1));xx=next;return old;})()) if(Number(!!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(xx)*(C.sizes["struct rm"]*21))+Number(yy)*C.sizes["struct rm"]),"rm","typ").value))>=C.ROOM))||Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(xx)*(C.sizes["struct rm"]*21))+Number(yy)*C.sizes["struct rm"]),"rm","typ").value)==C.CROSSWALL)))) {
                (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value=C.i8(((Number(C.i32(yy)!=C.i32(y)))?C.HWALL:C.VWALL)));
                (yy=hi_yy);
                /* end `yy' loop */
                break;
                /* end `xx' loop */
            }


        }
    }
}

/*
 * Select a random coordinate in the maze.
 *
 * We want a place not 'touched' by the loader.  That is, a place in
 * the maze outside every part of the special level.
 */
export function maze1xy(m,humidity)
{
    humidity=C.i32(humidity);
    let x; let y; let tryct=2000;
    /* tryct:  normally it won't take more than ten or so tries due
       to the circumstances under which we'll be called, but the
       `humidity' screening might drastically change the chances */
    do {
        (x=(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),2908,(C.literal("maze1xy"))),C.rn2(C.i32((C.field(C.gx,"instance_globals_x","x_maze_max").value-3))))):C.rn2(C.i32((C.field(C.gx,"instance_globals_x","x_maze_max").value-3)))))+(3)))));
        (y=(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),2909,(C.literal("maze1xy"))),C.rn2(C.i32((C.field(C.gy,"instance_globals_y","y_maze_max").value-3))))):C.rn2(C.i32((C.field(C.gy,"instance_globals_y","y_maze_max").value-3)))))+(3)))));
        if(Number((()=>{const old=tryct;const next=C.i32((old-1));tryct=next;return next;})()<0)) break;
        /* give up */
    } while(Number(!!(Number(!!(Number(!!(Number(!((C.i32((x%2)))))||Number(!((C.i32((y%2)))))))||C.i32(C.cell(((C.SpLev_Map+Number(x)*(1*21))+Number(y)*1),"char").value)))||Number(!(is_ok_location(C.i16(x),C.i16(y),C.u32(humidity)))))));
    ((C.field(m,"nhcoord","x").value=C.i16(x)),(C.field(m,"nhcoord","y").value=C.i16(y)));
}

/*
 * If there's a significant portion of maze unused by the special level,
 * we don't want it empty.
 *
 * Makes the number of traps, monsters, etc. proportional
 * to the size of the maze.
 */
export function fill_empty_maze()
{
    const stackFrame=C.stackSave();
    try {
    let mapcountmax; let mapcount; let mapfact;
    let x; let y;
    let mm=C.stackAlloc(C.sizes["struct nhcoord"]);
    (mapcountmax=(mapcount=C.i32(((C.i32((C.field(C.gx,"instance_globals_x","x_maze_max").value-2)))*(C.i32((C.field(C.gy,"instance_globals_y","y_maze_max").value-2)))))));
    (mapcountmax=C.i32(Math.trunc((mapcountmax/2))));
    for((x=C.i16(2));Number(C.i32(x)<C.field(C.gx,"instance_globals_x","x_maze_max").value);(()=>{const old=x;const next=C.i16((old+1));x=next;return old;})()) for((y=C.i16(0));Number(C.i32(y)<C.field(C.gy,"instance_globals_y","y_maze_max").value);(()=>{const old=y;const next=C.i16((old+1));y=next;return old;})()) if(C.cell(((C.SpLev_Map+Number(x)*(1*21))+Number(y)*1),"char").value) (()=>{const old=mapcount;const next=C.i32((old-1));mapcount=next;return old;})();


    if((Number(mapcount>(C.i32(Math.trunc((mapcountmax/10))))))) {
        (mapfact=C.i32((C.i64(((C.i64((C.i64(mapcount)*100n)))/C.i64(mapcountmax))))));
        for((x=C.i16(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),2942,(C.literal("fill_empty_maze"))),C.rnd(C.i32(Math.trunc(((C.i32((20*mapfact)))/100)))))):C.rnd(C.i32(Math.trunc(((C.i32((20*mapfact)))/100))))))));x;(()=>{const old=x;const next=C.i16((old-1));x=next;return old;})()) {
            maze1xy(mm,1);
            C.mkobj_at(C.i8((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),2944,(C.literal("fill_empty_maze"))),C.rn2(2))):C.rn2(2)))?C.GEM_CLASS:C.RANDOM_CLASS)),C.field(mm,"nhcoord","x").value,C.field(mm,"nhcoord","y").value,(C.i8(1)));
        }
        for((x=C.i16(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),2947,(C.literal("fill_empty_maze"))),C.rnd(C.i32(Math.trunc(((C.i32((12*mapfact)))/100)))))):C.rnd(C.i32(Math.trunc(((C.i32((12*mapfact)))/100))))))));x;(()=>{const old=x;const next=C.i16((old-1));x=next;return old;})()) {
            let ttmp;
            maze1xy(mm,1);
            if(Number(!!(Number(((ttmp=C.t_at(C.field(mm,"nhcoord","x").value,C.field(mm,"nhcoord","y").value)))!=0)&&(Number(!!((Number(!!(Number(C.i32((C.field(ttmp,"trap","ttyp").value))==C.PIT)||Number(C.i32((C.field(ttmp,"trap","ttyp").value))==C.SPIKED_PIT))))||(Number(!!(Number(C.i32((C.field(ttmp,"trap","ttyp").value))==C.HOLE)||Number(C.i32((C.field(ttmp,"trap","ttyp").value))==C.TRAPDOOR)))))))))) continue;
            C.mksobj_at(C.BOULDER,C.field(mm,"nhcoord","x").value,C.field(mm,"nhcoord","y").value,(C.i8(1)),(C.i8(0)));
        }
        for((x=C.i16(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),2956,(C.literal("fill_empty_maze"))),C.rn2(2))):C.rn2(2)))));x;(()=>{const old=x;const next=C.i16((old-1));x=next;return old;})()) {
            maze1xy(mm,1);
            C.makemon((C.mons+Number(C.PM_MINOTAUR)*C.sizes["struct permonst"]),C.field(mm,"nhcoord","x").value,C.field(mm,"nhcoord","y").value,C.u32(0n));
        }
        for((x=C.i16(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),2960,(C.literal("fill_empty_maze"))),C.rnd(C.i32(Math.trunc(((C.i32((12*mapfact)))/100)))))):C.rnd(C.i32(Math.trunc(((C.i32((12*mapfact)))/100))))))));x;(()=>{const old=x;const next=C.i16((old-1));x=next;return old;})()) {
            maze1xy(mm,1);
            C.makemon(0,C.field(mm,"nhcoord","x").value,C.field(mm,"nhcoord","y").value,C.u32(0n));
        }
        for((x=C.i16(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),2964,(C.literal("fill_empty_maze"))),C.rn2(C.i32(Math.trunc(((C.i32((15*mapfact)))/100)))))):C.rn2(C.i32(Math.trunc(((C.i32((15*mapfact)))/100))))))));x;(()=>{const old=x;const next=C.i16((old-1));x=next;return old;})()) {
            maze1xy(mm,1);
            C.mkgold(0n,C.field(mm,"nhcoord","x").value,C.field(mm,"nhcoord","y").value);
        }
        for((x=C.i16(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),2968,(C.literal("fill_empty_maze"))),C.rn2(C.i32(Math.trunc(((C.i32((15*mapfact)))/100)))))):C.rn2(C.i32(Math.trunc(((C.i32((15*mapfact)))/100))))))));x;(()=>{const old=x;const next=C.i16((old-1));x=next;return old;})()) {
            let trytrap;
            maze1xy(mm,1);
            (trytrap=rndtrap());
            if(C.sobj_at(C.BOULDER,C.field(mm,"nhcoord","x").value,C.field(mm,"nhcoord","y").value)) while(Number(!!((Number(!!(Number((trytrap)==C.PIT)||Number((trytrap)==C.SPIKED_PIT))))||(Number(!!(Number((trytrap)==C.HOLE)||Number((trytrap)==C.TRAPDOOR))))))) (trytrap=rndtrap());

            C.maketrap(C.field(mm,"nhcoord","x").value,C.field(mm,"nhcoord","y").value,trytrap);
        }
    }
    } finally {C.stackRestore(stackFrame); }
}

export function splev_initlev(linit)
{
    switch(C.i32(C.field(linit,"lev_init","init_style").value)) {
        default:
            C.variadic(21,C.literal("Unrecognized level init style."));
        break;
        case (C.LVLINIT_NONE):
            break;
        case (C.LVLINIT_SOLIDFILL):
            if(Number(C.i32(C.field(linit,"lev_init","lit").value)==(C.i32((-1))))) (C.field(linit,"lev_init","lit").value=C.i16(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),2992,(C.literal("splev_initlev"))),C.rn2(2))):C.rn2(2)))));
        lvlfill_solid(C.field(linit,"lev_init","filling").value,C.i8(C.field(linit,"lev_init","lit").value));
        break;
        case (C.LVLINIT_MAZEGRID):
            lvlfill_maze_grid(2,0,C.field(C.gx,"instance_globals_x","x_maze_max").value,C.field(C.gy,"instance_globals_y","y_maze_max").value,C.i8(C.field(linit,"lev_init","bg").value));
        break;
        case (C.LVLINIT_MAZE):
            C.create_maze(C.field(linit,"lev_init","corrwid").value,C.field(linit,"lev_init","wallthick").value,C.field(linit,"lev_init","rm_deadends").value);
        break;
        case (C.LVLINIT_ROGUE):
            C.makeroguerooms();
        break;
        case (C.LVLINIT_MINES):
            if(Number(C.i32(C.field(linit,"lev_init","lit").value)==(C.i32((-1))))) (C.field(linit,"lev_init","lit").value=C.i16(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),3006,(C.literal("splev_initlev"))),C.rn2(2))):C.rn2(2)))));
        if(Number(C.i32(C.field(linit,"lev_init","filling").value)>C.i32((-1)))) lvlfill_solid(C.field(linit,"lev_init","filling").value,C.i8(0));
        (C.field(linit,"lev_init","icedpools").value=C.cell(C.icedpools,"signed char").value);
        C.mkmap(linit);
        break;
        case (C.LVLINIT_SWAMP):
            if(Number(C.i32(C.field(linit,"lev_init","lit").value)==(C.i32((-1))))) (C.field(linit,"lev_init","lit").value=C.i16(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),3014,(C.literal("splev_initlev"))),C.rn2(2))):C.rn2(2)))));
        lvlfill_swamp(C.i8(C.field(linit,"lev_init","fg").value),C.i8(C.field(linit,"lev_init","bg").value),C.i8(C.field(linit,"lev_init","lit").value));
        break;
    }
}

/*ARGUSED*/
export function spo_end_moninvent()
{
    if(C.cell(C.invent_carrying_monster,"struct monst *").value) C.m_dowear(C.cell(C.invent_carrying_monster,"struct monst *").value,(C.i8(1)));
    (C.cell(C.invent_carrying_monster,"struct monst *").value=0);
}

/*ARGUSED*/
export function spo_pop_container()
{
    if(Number(C.cell(C.container_idx,"int").value>0)) {
        (()=>{const slot=C.cell(C.container_idx,"int");const old=slot.value;const next=C.i32((old-1));slot.value=next;return old;})();
        (C.cell((C.container_obj+Number(C.cell(C.container_idx,"int").value)*8),"struct obj *").value=0);
    }
}

/* push a table on lua stack: {width=wid, height=hei} */
export function l_push_wid_hei_table(L,wid,hei)
{
    wid=C.i32(wid);
    hei=C.i32(hei);
    C.lua_createtable(L,0,0);
    C.nhl_add_table_entry_int(L,C.literal("width"),C.i64(wid));
    C.nhl_add_table_entry_int(L,C.literal("height"),C.i64(hei));
}

/* push a table on lua stack containing room data */
export function l_push_mkroom_table(L,tmpr)
{
    C.lua_createtable(L,0,0);
    C.nhl_add_table_entry_int(L,C.literal("width"),C.i64(C.i32((1+(C.i32((C.i32(C.field(tmpr,"mkroom","hx").value)-C.i32(C.field(tmpr,"mkroom","lx").value))))))));
    C.nhl_add_table_entry_int(L,C.literal("height"),C.i64(C.i32((1+(C.i32((C.i32(C.field(tmpr,"mkroom","hy").value)-C.i32(C.field(tmpr,"mkroom","ly").value))))))));
    C.nhl_add_table_entry_region(L,C.literal("region"),C.field(tmpr,"mkroom","lx").value,C.field(tmpr,"mkroom","ly").value,C.field(tmpr,"mkroom","hx").value,C.field(tmpr,"mkroom","hy").value);
    C.nhl_add_table_entry_bool(L,C.literal("lit"),C.field(tmpr,"mkroom","rlit").value);
    C.nhl_add_table_entry_bool(L,C.literal("irregular"),C.field(tmpr,"mkroom","irregular").value);
    C.nhl_add_table_entry_bool(L,C.literal("needjoining"),C.field(tmpr,"mkroom","needjoining").value);
    C.nhl_add_table_entry_str(L,C.literal("type"),get_mkroom_name(C.i32(C.field(tmpr,"mkroom","rtype").value)));
}

/* message("What a strange feeling!"); */
export function lspo_message(L)
{
    let levmsg;
    let old_n; let n;
    let msg;
    let argc=C.lua_gettop(L);
    if(Number(argc<1)) {
        C.nhl_error(L,C.literal("Wrong parameters"));
        /*NOTREACHED*/
        return 0;
    }
    create_des_coder();
    (msg=(C.luaL_checklstring(L,(1),0)));
    (old_n=C.i32((C.field(C.gl,"instance_globals_l","lev_message").value?(C.u32((C.Strlen_(C.field(C.gl,"instance_globals_l","lev_message").value,(C.literal("lspo_message")),3094)+C.u32(1)))):C.u32(0))));
    (n=C.i32(C.Strlen_(msg,(C.literal("lspo_message")),3095)));
    (levmsg=C.alloc(C.u32(C.i32((C.i32((old_n+n))+1)))));
    if(old_n) (C.cell((levmsg+Number(C.i32((old_n-1)))*1),"char").value=C.i8(10));
    if(C.field(C.gl,"instance_globals_l","lev_message").value) C.memcpy(levmsg,C.field(C.gl,"instance_globals_l","lev_message").value,C.u64(C.i32((old_n-1))));
    C.memcpy((levmsg+Number(old_n)*1),msg,C.u64(n));
    (C.cell((levmsg+Number(C.i32((old_n+n)))*1),"char").value=C.i8(0));
    do {
        if(C.field(C.gl,"instance_globals_l","lev_message").value) C.free((C.field(C.gl,"instance_globals_l","lev_message").value));
    } while(0);
    (C.field(C.gl,"instance_globals_l","lev_message").value=levmsg);
    return 0;
    /* number of results */
}

export function get_table_align(L)
{
    const gtaligns=C.staticData("get_table_align","gtaligns",()=>[C.literal("noalign"),C.literal("law"),C.literal("neutral"),C.literal("chaos"),C.literal("coaligned"),C.literal("noncoaligned"),C.literal("random"),0]);
    const aligns2i=C.staticData("get_table_align","aligns2i",()=>[0,4,2,1,32,64,128,0]);
    let a=C.cell((aligns2i+Number(C.get_table_option(L,C.literal("align"),C.literal("random"),gtaligns))*4),"int").value;
    return a;
}

export function get_table_monclass(L)
{
    let s=C.get_table_str_opt(L,C.literal("class"),0);
    let ret=C.i32((-1));
    if(Number(!!(s&&Number(C.strlen(s)==C.u64(1))))) (ret=C.i32(C.cell(s,"char").value));
    do {
        if(s) C.free((s));
    } while(0);
    return ret;
}

export function find_montype(L,s,mgender)
{
    const stackFrame=C.stackSave();
    try {
    let i; let mgendAddress=C.stackAlloc(4); C.cell(mgendAddress,"int").value=C.NEUTRAL;
    (i=C.name_to_monplus(s,0,mgendAddress));
    if(Number(!!(Number(i>=C.LOW_PM)&&Number(i<C.NUMMONS)))) {
        if(Number(!!((Number((C.u64((C.field(((C.mons+Number(i)*C.sizes["struct permonst"])),"permonst","mflags2").value&C.u64(65536n))))!=C.u64(0n)))||(Number((C.u64((C.field(((C.mons+Number(i)*C.sizes["struct permonst"])),"permonst","mflags2").value&C.u64(131072n))))!=C.u64(0n)))))) (C.cell(mgendAddress,"int").value=((Number((C.u64((C.field(((C.mons+Number(i)*C.sizes["struct permonst"])),"permonst","mflags2").value&C.u64(131072n))))!=C.u64(0n)))?C.FEMALE:C.MALE));
 else (C.cell(mgendAddress,"int").value=((Number(C.cell(mgendAddress,"int").value==C.FEMALE))?C.FEMALE:((Number(C.cell(mgendAddress,"int").value==C.MALE))?C.MALE:((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),3156,(C.literal("find_montype"))),C.rn2(2))):C.rn2(2))))));
        if(mgender) (C.cell(mgender,"int").value=C.cell(mgendAddress,"int").value);
        return i;
    }
    if(mgender) (C.cell(mgender,"int").value=C.NEUTRAL);
    return C.NON_PM;
    } finally {C.stackRestore(stackFrame); }
}

export function get_table_montype(L,mgender)
{
    let s=C.get_table_str_opt(L,C.literal("id"),0);
    let ret=C.NON_PM;
    if(s) {
        (ret=find_montype(L,s,mgender));
        do {
            if(s) C.free((s));
        } while(0);
        if(Number(ret==C.NON_PM)) C.nhl_error(L,C.literal("Unknown monster id"));
    }
    return ret;
}

/* Get x and y values from a table (which the caller has already checked for
 * the existence of), handling both a table with x= and y= specified and a
 * table with coord= specified.
 * Returns absolute rather than map-relative coordinates; the caller of this
 * function must decide if it wants to interpret the coordinates as
 * map-relative and adjust accordingly. */
export function get_table_xy_or_coord(L,x,y)
{
    const stackFrame=C.stackSave();
    try {
    let mxAddress=C.stackAlloc(8); C.cell(mxAddress,"long long").value=C.i64(C.get_table_int_opt(L,C.literal("x"),C.i32((-1))));
    let myAddress=C.stackAlloc(8); C.cell(myAddress,"long long").value=C.i64(C.get_table_int_opt(L,C.literal("y"),C.i32((-1))));
    if(Number(!!(Number(C.cell(mxAddress,"long long").value==C.i64(C.i32((-1))))&&Number(C.cell(myAddress,"long long").value==C.i64(C.i32((-1))))))) {
        C.lua_getfield(L,1,C.literal("coord"));
        get_coord(L,C.i32((-1)),mxAddress,myAddress);
        C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
    }
    (C.cell(x,"long long").value=C.cell(mxAddress,"long long").value);
    (C.cell(y,"long long").value=C.cell(myAddress,"long long").value);
    } finally {C.stackRestore(stackFrame); }
}

/* monster(); */
/* monster("wood nymph"); */
/* monster("D"); */
/* monster("giant eel",11,06); */
/* monster("hill giant", {08,06}); */
/* monster({ id = "giant mimic", appear_as = "obj:boulder" }); */
/* monster({ class = "H", peaceful = 0 }); */
export function lspo_monster(L)
{
    const stackFrame=C.stackSave();
    try {
    let argc=C.lua_gettop(L);
    let tmpmons=C.stackAlloc(C.sizes["monster"]);
    let mxAddress=C.stackAlloc(8); C.cell(mxAddress,"long long").value=C.i64(C.i32((-1))); let myAddress=C.stackAlloc(8); C.cell(myAddress,"long long").value=C.i64(C.i32((-1)));
    let mgendAddress=C.stackAlloc(4); C.cell(mgendAddress,"int").value=C.NEUTRAL;
    let mappear=0;
    create_des_coder();
    (C.field(tmpmons,"monster","peaceful").value=C.i8(C.i32((-1))));
    (C.field(tmpmons,"monster","asleep").value=C.i8(C.i32((-1))));
    (C.field(C.field(tmpmons,"monster","name").address,"str_or_len","str").value=0);
    (C.field(tmpmons,"monster","appear").value=C.i16(0));
    (C.field(C.field(tmpmons,"monster","appear_as").address,"str_or_len","str").value=0);
    (C.field(tmpmons,"monster","sp_amask").value=C.u32(128));
    (C.field(tmpmons,"monster","female").value=C.i16(0));
    (C.field(tmpmons,"monster","invis").value=C.i16(0));
    (C.field(tmpmons,"monster","cancelled").value=C.i16(0));
    (C.field(tmpmons,"monster","revived").value=C.i16(0));
    (C.field(tmpmons,"monster","avenge").value=C.i16(0));
    (C.field(tmpmons,"monster","fleeing").value=C.i16(0));
    (C.field(tmpmons,"monster","blinded").value=C.i16(0));
    (C.field(tmpmons,"monster","paralyzed").value=C.i16(0));
    (C.field(tmpmons,"monster","stunned").value=C.i16(0));
    (C.field(tmpmons,"monster","confused").value=C.i16(0));
    (C.field(tmpmons,"monster","seentraps").value=C.i64(0));
    (C.field(tmpmons,"monster","has_invent").value=C.i16(2));
    (C.field(tmpmons,"monster","waiting").value=C.i16(0));
    (C.field(tmpmons,"monster","mm_flags").value=C.u32(0n));
    (C.field(tmpmons,"monster","m_lev_adj").value=C.i16(0));
    if(Number(!!(Number(argc==1)&&Number(C.lua_type(L,1)==4)))) {
        let paramstr=(C.luaL_checklstring(L,(1),0));
        if(Number(C.strlen(paramstr)==C.u64(1))) {
            (C.field(tmpmons,"monster","class").value=C.i16(C.cell(paramstr,"char").value));
            (C.field(tmpmons,"monster","id").value=C.i16(C.NON_PM));
        } else {
            (C.field(tmpmons,"monster","class").value=C.i16(C.i32((-1))));
            (C.field(tmpmons,"monster","id").value=C.i16(find_montype(L,paramstr,mgendAddress)));
            (C.field(tmpmons,"monster","female").value=C.i16(((Number(C.cell(mgendAddress,"int").value==C.FEMALE))?C.FEMALE:((Number(C.cell(mgendAddress,"int").value==C.MALE))?C.MALE:((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),3256,(C.literal("lspo_monster"))),C.rn2(2))):C.rn2(2)))))));
        }
    } else if(Number(!!(Number(!!(Number(argc==2)&&Number(C.lua_type(L,1)==4)))&&Number(C.lua_type(L,2)==5)))) {
        let paramstr=(C.luaL_checklstring(L,(1),0));
        get_coord(L,2,mxAddress,myAddress);
        if(Number(C.strlen(paramstr)==C.u64(1))) {
            (C.field(tmpmons,"monster","class").value=C.i16(C.cell(paramstr,"char").value));
            (C.field(tmpmons,"monster","id").value=C.i16(C.NON_PM));
        } else {
            (C.field(tmpmons,"monster","class").value=C.i16(C.i32((-1))));
            (C.field(tmpmons,"monster","id").value=C.i16(find_montype(L,paramstr,mgendAddress)));
            (C.field(tmpmons,"monster","female").value=C.i16(((Number(C.cell(mgendAddress,"int").value==C.FEMALE))?C.FEMALE:((Number(C.cell(mgendAddress,"int").value==C.MALE))?C.MALE:((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),3271,(C.literal("lspo_monster"))),C.rn2(2))):C.rn2(2)))))));
        }
    } else if(Number(argc==3)) {
        let paramstr=(C.luaL_checklstring(L,(1),0));
        (C.cell(mxAddress,"long long").value=C.luaL_checkinteger(L,2));
        (C.cell(myAddress,"long long").value=C.luaL_checkinteger(L,3));
        if(Number(C.strlen(paramstr)==C.u64(1))) {
            (C.field(tmpmons,"monster","class").value=C.i16(C.cell(paramstr,"char").value));
            (C.field(tmpmons,"monster","id").value=C.i16(C.NON_PM));
        } else {
            (C.field(tmpmons,"monster","class").value=C.i16(C.i32((-1))));
            (C.field(tmpmons,"monster","id").value=C.i16(find_montype(L,paramstr,mgendAddress)));
            (C.field(tmpmons,"monster","female").value=C.i16(((Number(C.cell(mgendAddress,"int").value==C.FEMALE))?C.FEMALE:((Number(C.cell(mgendAddress,"int").value==C.MALE))?C.MALE:((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),3287,(C.literal("lspo_monster"))),C.rn2(2))):C.rn2(2)))))));
        }
    } else {
        let keep_default_invent=C.i32((-1));
        /* -1 = unspecified */
        C.lcheck_param_table(L);
        (C.field(tmpmons,"monster","peaceful").value=C.i8(C.get_table_boolean_opt(L,C.literal("peaceful"),(C.i32((-1))))));
        (C.field(tmpmons,"monster","asleep").value=C.i8(C.get_table_boolean_opt(L,C.literal("asleep"),(C.i32((-1))))));
        (C.field(C.field(tmpmons,"monster","name").address,"str_or_len","str").value=C.get_table_str_opt(L,C.literal("name"),0));
        (C.field(tmpmons,"monster","appear").value=C.i16(0));
        (C.field(C.field(tmpmons,"monster","appear_as").address,"str_or_len","str").value=0);
        (C.field(tmpmons,"monster","sp_amask").value=C.u32(get_table_align(L)));
        (C.field(tmpmons,"monster","female").value=C.i16(C.get_table_boolean_opt(L,C.literal("female"),(C.i32((-1))))));
        (C.field(tmpmons,"monster","invis").value=C.i16(C.get_table_boolean_opt(L,C.literal("invisible"),C.i32((C.i8(0))))));
        (C.field(tmpmons,"monster","cancelled").value=C.i16(C.get_table_boolean_opt(L,C.literal("cancelled"),C.i32((C.i8(0))))));
        (C.field(tmpmons,"monster","revived").value=C.i16(C.get_table_boolean_opt(L,C.literal("revived"),C.i32((C.i8(0))))));
        (C.field(tmpmons,"monster","avenge").value=C.i16(C.get_table_boolean_opt(L,C.literal("avenge"),C.i32((C.i8(0))))));
        (C.field(tmpmons,"monster","fleeing").value=C.i16(C.get_table_int_opt(L,C.literal("fleeing"),0)));
        (C.field(tmpmons,"monster","blinded").value=C.i16(C.get_table_int_opt(L,C.literal("blinded"),0)));
        (C.field(tmpmons,"monster","paralyzed").value=C.i16(C.get_table_int_opt(L,C.literal("paralyzed"),0)));
        (C.field(tmpmons,"monster","stunned").value=C.i16(C.get_table_boolean_opt(L,C.literal("stunned"),C.i32((C.i8(0))))));
        (C.field(tmpmons,"monster","confused").value=C.i16(C.get_table_boolean_opt(L,C.literal("confused"),C.i32((C.i8(0))))));
        (C.field(tmpmons,"monster","waiting").value=C.i16(C.get_table_boolean_opt(L,C.literal("waiting"),C.i32((C.i8(0))))));
        (C.field(tmpmons,"monster","m_lev_adj").value=C.i16(C.get_table_int_opt(L,C.literal("m_lev_adj"),0)));
        (C.field(tmpmons,"monster","seentraps").value=C.i64(0));
        /* TODO: list of trap names to bitfield */
        (keep_default_invent=C.get_table_boolean_opt(L,C.literal("keep_default_invent"),C.i32((-1))));
        if(Number(!(C.get_table_boolean_opt(L,C.literal("tail"),C.i32((C.i8(1))))))) (()=>{const slot=C.field(tmpmons,"monster","mm_flags");const old=slot.value;const next=C.u32(C.i64(C.i64(old)|16384n));slot.value=next;return next;})();
        if(Number(!(C.get_table_boolean_opt(L,C.literal("group"),C.i32((C.i8(1))))))) (()=>{const slot=C.field(tmpmons,"monster","mm_flags");const old=slot.value;const next=C.u32(C.i64(C.i64(old)|8192n));slot.value=next;return next;})();
        if(C.get_table_boolean_opt(L,C.literal("adjacentok"),C.i32((C.i8(0))))) (()=>{const slot=C.field(tmpmons,"monster","mm_flags");const old=slot.value;const next=C.u32(C.i64(C.i64(old)|16n));slot.value=next;return next;})();
        if(C.get_table_boolean_opt(L,C.literal("ignorewater"),C.i32((C.i8(0))))) (()=>{const slot=C.field(tmpmons,"monster","mm_flags");const old=slot.value;const next=C.u32(C.i64(C.i64(old)|8n));slot.value=next;return next;})();
        if(Number(!(C.get_table_boolean_opt(L,C.literal("countbirth"),C.i32((C.i8(1))))))) (()=>{const slot=C.field(tmpmons,"monster","mm_flags");const old=slot.value;const next=C.u32(C.i64(C.i64(old)|4n));slot.value=next;return next;})();
        (mappear=C.get_table_str_opt(L,C.literal("appear_as"),0));
        if(mappear) {
            if(Number(!(C.strncmp(C.literal("obj:"),mappear,C.u64(4))))) {
                (C.field(tmpmons,"monster","appear").value=C.i16(C.M_AP_OBJECT));
            } else if(Number(!(C.strncmp(C.literal("mon:"),mappear,C.u64(4))))) {
                (C.field(tmpmons,"monster","appear").value=C.i16(C.M_AP_MONSTER));
            } else if(Number(!(C.strncmp(C.literal("ter:"),mappear,C.u64(4))))) {
                (C.field(tmpmons,"monster","appear").value=C.i16(C.M_AP_FURNITURE));
            } else {
                C.nhl_error(L,C.literal("Unknown appear_as type"));
            }
            (C.field(C.field(tmpmons,"monster","appear_as").address,"str_or_len","str").value=C.dupstr((mappear+Number(4)*1)));
            do {
                if(mappear) C.free((mappear));
            } while(0);
        }
        get_table_xy_or_coord(L,mxAddress,myAddress);
        (C.field(tmpmons,"monster","id").value=C.i16(get_table_montype(L,mgendAddress)));
        /* get_table_montype will return a random gender if the species isn't
         * all-male or all-female; if the level designer specified a certain
         * gender, override that random one now, unless it *is* a one-gender
         * species, in which case don't override (don't permit creation of a
         * male nymph or female Nazgul, etc.) */
        if(Number(!!(Number(C.cell(mgendAddress,"int").value!=C.NEUTRAL)&&(Number(!!(Number(!!(Number(C.i32(C.field(tmpmons,"monster","female").value)==(C.i32((-1))))||(Number((C.u64((C.field(((C.mons+Number(C.field(tmpmons,"monster","id").value)*C.sizes["struct permonst"])),"permonst","mflags2").value&C.u64(131072n))))!=C.u64(0n)))))||(Number((C.u64((C.field(((C.mons+Number(C.field(tmpmons,"monster","id").value)*C.sizes["struct permonst"])),"permonst","mflags2").value&C.u64(65536n))))!=C.u64(0n))))))))) (C.field(tmpmons,"monster","female").value=C.i16(C.cell(mgendAddress,"int").value));
        /* safety net - if find_montype did not find a gender for this species
         * (should cause a lua error anyway) */
        if(Number(C.i32(C.field(tmpmons,"monster","female").value)==(C.i32((-1))))) (C.field(tmpmons,"monster","female").value=C.i16(0));
        (C.field(tmpmons,"monster","class").value=C.i16(get_table_monclass(L)));
        C.lua_getfield(L,1,C.literal("inventory"));
        if(Number(!((Number(C.lua_type(L,(C.i32((-1))))==0))))) {
            /* overwrite DEFAULT_INVENT - most times inventory is specified,
             * the monster should not get its species' default inventory. Only
             * provide it if explicitly requested. */
            (C.field(tmpmons,"monster","has_invent").value=C.i16(1));
            if(Number(keep_default_invent==C.i32((C.i8(1))))) (()=>{const slot=C.field(tmpmons,"monster","has_invent");const old=slot.value;const next=C.i16(C.i32(C.i32(old)|2));slot.value=next;return next;})();
        } else {
            /* if keep_default_invent was not specified (-1), keep has_invent as
             * DEFAULT_INVENT and provide the species' default inventory.
             * But if it was explicitly set to false, provide *no* inventory. */
            if(Number(keep_default_invent==C.i32((C.i8(0))))) (C.field(tmpmons,"monster","has_invent").value=C.i16(0));
        }
    }
    if(Number(!!(Number(C.cell(mxAddress,"long long").value==C.i64(C.i32((-1))))&&Number(C.cell(myAddress,"long long").value==C.i64(C.i32((-1))))))) (C.field(tmpmons,"monster","coord").value=(C.i64((16777216n|C.i64((0))))));
 else (C.field(tmpmons,"monster","coord").value=C.i64((C.i64(((C.i64(((C.cell(mxAddress,"long long").value)&C.i64(255))))+(C.i64(((C.i64(((C.cell(myAddress,"long long").value)&C.i64(255))))<<BigInt(16)))))))));
    if(Number(!!(Number(C.i32(C.field(tmpmons,"monster","id").value)!=C.NON_PM)&&Number(C.i32(C.field(tmpmons,"monster","class").value)==C.i32((-1)))))) (C.field(tmpmons,"monster","class").value=C.i16((C.field((C.def_monsyms+Number(C.i32(C.field(((C.mons+Number(C.field(tmpmons,"monster","id").value)*C.sizes["struct permonst"])),"permonst","mlet").value))*C.sizes["struct class_sym"]),"class_sym","sym").value)));
    create_monster(tmpmons,C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value);
    if(Number(!!((C.i32((C.i32(C.field(tmpmons,"monster","has_invent").value)&1)))&&Number(C.lua_type(L,C.i32((-1)))==6)))) {
        ((C.lua_rotate(L,(C.i32((-2))),C.i32((-1))),C.lua_settop(L,C.i32((C.i32((-(1)))-1)))));
        C.nhl_pcall_handle(L,0,0,C.literal("lspo_monster"),C.i32(C.NHLpa_panic));
        spo_end_moninvent();
    } else C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
    do {
        if(C.field(C.field(tmpmons,"monster","name").address,"str_or_len","str").value) C.free((C.field(C.field(tmpmons,"monster","name").address,"str_or_len","str").value));
    } while(0);
    do {
        if(C.field(C.field(tmpmons,"monster","appear_as").address,"str_or_len","str").value) C.free((C.field(C.field(tmpmons,"monster","appear_as").address,"str_or_len","str").value));
    } while(0);
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

/* the hash key 'name' is an integer or "random",
   or if not existent, also return rndval */
export function get_table_int_or_random(L,name,rndval)
{
    rndval=C.i32(rndval);
    const stackFrame=C.stackSave();
    try {
    let ret;
    let buf=C.stackAlloc((1*256));
    C.lua_getfield(L,1,name);
    if(Number(C.lua_type(L,C.i32((-1)))==0)) {
        C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
        return C.i64(rndval);
    }
    if(Number(!(C.lua_isnumber(L,C.i32((-1)))))) {
        let tmp=C.lua_tolstring(L,(C.i32((-1))),0);
        if(Number(!!(tmp&&Number(!(C.strncmpi((C.literal("random")),(tmp),C.i32((-1)))))))) {
            C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
            return C.i64(rndval);
        }
        C.variadic(22,buf,C.literal("Expected integer or \"random\" for \"%s\", got "),name);
        if(tmp) C.variadic(23,C.eos(buf),C.literal("\"%s\""),tmp);
 else C.strcat(buf,C.literal("<Null>"));
        C.nhl_error(L,buf);
        /*NOTREACHED*/
        C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
        return C.i64(0);
    }
    (ret=C.luaL_optinteger(L,C.i32((-1)),C.i64(rndval)));
    C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
    return ret;
    } finally {C.stackRestore(stackFrame); }
}

export function get_table_buc(L)
{
    const bucs=C.staticData("get_table_buc","bucs",()=>[C.literal("random"),C.literal("blessed"),C.literal("uncursed"),C.literal("cursed"),C.literal("not-cursed"),C.literal("not-uncursed"),C.literal("not-blessed"),0]);
    const bucs2i=C.staticData("get_table_buc","bucs2i",()=>[0,1,2,3,4,5,6,0]);
    let curse_state=C.cell((bucs2i+Number(C.get_table_option(L,C.literal("buc"),C.literal("random"),bucs))*4),"int").value;
    return curse_state;
}

export function get_table_objclass(L)
{
    let s=C.get_table_str_opt(L,C.literal("class"),0);
    let ret=C.i32((-1));
    if(Number(!!(s&&Number(C.strlen(s)==C.u64(1))))) (ret=C.i32(C.cell(s,"char").value));
    do {
        if(s) C.free((s));
    } while(0);
    return ret;
}

/* find object otyp by text s (optionally considering oclass) */
export function find_objtype(L,s,oclass)
{
    oclass=C.i8(oclass);
    if(Number(!!(s&&C.i32(C.cell(s,"char").value)))) {
        let i;
        let objname;
        let class_=C.i8(C.def_char_to_objclass(oclass));
        /* In objects.h, some item classes are defined without prefixes
           (such as "scroll of ") in their names, making some names (such
           as "teleportation") ambiguous.  Get the object class if it is
           specified, and only return an object of the matching class. */
        const class_prefixes=C.staticData("find_objtype","class_prefixes",()=>[[C.literal("ring of "),C.i8(C.RING_CLASS)],[C.literal("potion of "),C.i8(C.POTION_CLASS)],[C.literal("scroll of "),C.i8(C.SCROLL_CLASS)],[C.literal("spellbook of "),C.i8(C.SPBOOK_CLASS)],[C.literal("wand of "),C.i8(C.WAND_CLASS)],[0,C.i8(0)]]);
        if(Number(C.i32(class_)==C.MAXOCLASSES)) (class_=C.i8(0));
        if(C.strstri(s,C.literal(" of "))) {
            for((i=0);C.field((class_prefixes+Number(i)*C.sizes["sp_lev_objclasspfx"]),"objclasspfx","prefix").value;(()=>{const old=i;const next=C.i32((old+1));i=next;return old;})()) {
                let p=C.field((class_prefixes+Number(i)*C.sizes["sp_lev_objclasspfx"]),"objclasspfx","prefix").value;
                if(Number(!(C.strncmpi(s,p,C.i32(C.strlen(p)))))) {
                    (class_=C.field((class_prefixes+Number(i)*C.sizes["sp_lev_objclasspfx"]),"objclasspfx","class").value);
                    (s=(s+Number(C.strlen(p))*1));
                    break;
                }
            }
        }
        /* find by object name */
        for((i=0);Number(i<C.NUM_OBJECTS);(()=>{const old=i;const next=C.i32((old+1));i=next;return old;})()) {
            (objname=(C.field((C.obj_descr+Number(C.field((C.objects+Number(i)*C.sizes["struct objclass"]),"objclass","oc_name_idx").value)*C.sizes["struct objdescr"]),"objdescr","oc_name").value));
            if(Number(!!(Number(!!((Number(!!(Number(!(class_))||Number(C.i32(class_)==C.i32(C.field((C.objects+Number(i)*C.sizes["struct objclass"]),"objclass","oc_class").value)))))&&objname))&&Number(!(C.strncmpi((s),(objname),C.i32((-1)))))))) return i;
        }
        /*
         * FIXME:
         *  If the file specifies "orange potion", the actual object
         *  description is just "orange" and won't match.  [There's a
         *  reason that wish handling is insanely complicated.]  And
         *  even if that gets fixed, if the file specifies "gray stone"
         *  it will start matching but would always pick the first one.
         *
         *  "orange potion" is an unlikely thing to have in a special
         *  level description but "gray stone" is not....
         */
        /* find by object description */
        for((i=0);Number(i<C.NUM_OBJECTS);(()=>{const old=i;const next=C.i32((old+1));i=next;return old;})()) {
            (objname=(C.field((C.obj_descr+Number(C.field((C.objects+Number(i)*C.sizes["struct objclass"]),"objclass","oc_descr_idx").value)*C.sizes["struct objdescr"]),"objdescr","oc_descr").value));
            if(Number(!!(objname&&Number(!(C.strncmpi((s),(objname),C.i32((-1)))))))) return i;
        }
        C.nhl_error(L,C.literal("Unknown object id"));
    }
    return C.STRANGE_OBJECT;
}

export function get_table_objtype(L)
{
    let s=C.get_table_str_opt(L,C.literal("id"),0);
    let oclass=C.i8(get_table_objclass(L));
    let ret=find_objtype(L,s,oclass);
    do {
        if(s) C.free((s));
    } while(0);
    return ret;
}

/* object(); */
/* object("sack"); */
/* object("scimitar", 6,7); */
/* object("scimitar", {6,7}); */
/* object({ class = "%" }); */
/* object({ id = "boulder", x = 03, y = 12}); */
/* object({ id = "boulder", coord = {03,12} }); */
export function lspo_object(L)
{
    const stackFrame=C.stackSave();
    try {
    const zeroobject=C.staticData("lspo_object","zeroobject",()=>[({$union:"str",value:0}),0,C.i16(0),C.i16(0),C.i64(0),C.i16(0),C.i16(0),C.i16(0),C.i16(0),C.i8(0),0,C.i16(0),C.i16(0),C.i16(0),C.i16(0),C.i16(0),C.i16(0),C.i16(0),C.i16(0),C.i16(0),C.i16(0),C.i16(0)]);
    /* Str_or_len name */
    /* corpsenm */
    /* id, spe */
    /* coord */
    /* coordxy x,y */
    /* class, containment */
    /* curse_state */
    /* quan */
    /* buried */
    /* lit */
    /* eroded, locked, trapped, tknown, recharged */
    /* invis, greased, broken, achievement */
    let quancnt;
    let tmpobj=C.stackAlloc(C.sizes["object"]);
    let oxAddress=C.stackAlloc(8); C.cell(oxAddress,"long long").value=C.i64(C.i32((-1))); let oyAddress=C.stackAlloc(8); C.cell(oyAddress,"long long").value=C.i64(C.i32((-1)));
    let argc=C.lua_gettop(L);
    let maybe_contents=0;
    let otmp=0;
    create_des_coder();
    C.copyRecord(tmpobj,zeroobject,C.sizes["object"]);
    (C.field(C.field(tmpobj,"object","name").address,"str_or_len","str").value=0);
    (C.field(tmpobj,"object","spe").value=C.i16(C.i32((-127))));
    (C.field(tmpobj,"object","quan").value=C.i32((-1)));
    (C.field(tmpobj,"object","trapped").value=C.i16(C.i32((-1))));
    (C.field(tmpobj,"object","tknown").value=C.i16(C.i32((-1))));
    (C.field(tmpobj,"object","locked").value=C.i16(C.i32((-1))));
    (C.field(tmpobj,"object","corpsenm").value=C.NON_PM);
    if(Number(!!(Number(argc==1)&&Number(C.lua_type(L,1)==4)))) {
        let paramstr=(C.luaL_checklstring(L,(1),0));
        if(Number(C.strlen(paramstr)==C.u64(1))) {
            (C.field(tmpobj,"object","class").value=C.i16(C.cell(paramstr,"char").value));
            (C.field(tmpobj,"object","id").value=C.i16(C.STRANGE_OBJECT));
        } else {
            (C.field(tmpobj,"object","class").value=C.i16(C.i32((-1))));
            (C.field(tmpobj,"object","id").value=C.i16(find_objtype(L,paramstr,C.i8(C.i32((-1))))));
        }
    } else if(Number(!!(Number(!!(Number(argc==2)&&Number(C.lua_type(L,1)==4)))&&Number(C.lua_type(L,2)==5)))) {
        let paramstr=(C.luaL_checklstring(L,(1),0));
        get_coord(L,2,oxAddress,oyAddress);
        if(Number(C.strlen(paramstr)==C.u64(1))) {
            (C.field(tmpobj,"object","class").value=C.i16(C.cell(paramstr,"char").value));
            (C.field(tmpobj,"object","id").value=C.i16(C.STRANGE_OBJECT));
        } else {
            (C.field(tmpobj,"object","class").value=C.i16(C.i32((-1))));
            (C.field(tmpobj,"object","id").value=C.i16(find_objtype(L,paramstr,C.i8(C.i32((-1))))));
        }
    } else if(Number(!!(Number(!!(Number(argc==3)&&Number(C.lua_type(L,2)==3)))&&Number(C.lua_type(L,3)==3)))) {
        let paramstr=(C.luaL_checklstring(L,(1),0));
        (C.cell(oxAddress,"long long").value=C.luaL_checkinteger(L,2));
        (C.cell(oyAddress,"long long").value=C.luaL_checkinteger(L,3));
        if(Number(C.strlen(paramstr)==C.u64(1))) {
            (C.field(tmpobj,"object","class").value=C.i16(C.cell(paramstr,"char").value));
            (C.field(tmpobj,"object","id").value=C.i16(C.STRANGE_OBJECT));
        } else {
            (C.field(tmpobj,"object","class").value=C.i16(C.i32((-1))));
            (C.field(tmpobj,"object","id").value=C.i16(find_objtype(L,paramstr,C.i8(C.i32((-1))))));
        }
    } else {
        C.lcheck_param_table(L);
        (C.field(tmpobj,"object","spe").value=C.i16(get_table_int_or_random(L,C.literal("spe"),C.i32((-127)))));
        (C.field(tmpobj,"object","curse_state").value=C.i8(get_table_buc(L)));
        (C.field(tmpobj,"object","corpsenm").value=C.NON_PM);
        (C.field(C.field(tmpobj,"object","name").address,"str_or_len","str").value=C.get_table_str_opt(L,C.literal("name"),0));
        (C.field(tmpobj,"object","quan").value=C.i32(get_table_int_or_random(L,C.literal("quantity"),C.i32((-1)))));
        (C.field(tmpobj,"object","buried").value=C.i16(C.get_table_boolean_opt(L,C.literal("buried"),0)));
        (C.field(tmpobj,"object","lit").value=C.i16(C.get_table_boolean_opt(L,C.literal("lit"),0)));
        (C.field(tmpobj,"object","eroded").value=C.i16(C.get_table_int_opt(L,C.literal("eroded"),0)));
        (C.field(tmpobj,"object","locked").value=C.i16(C.get_table_boolean_opt(L,C.literal("locked"),C.i32((-1)))));
        (C.field(tmpobj,"object","trapped").value=C.i16(C.get_table_boolean_opt(L,C.literal("trapped"),C.i32((-1)))));
        (C.field(tmpobj,"object","tknown").value=C.i16(C.get_table_boolean_opt(L,C.literal("trap_known"),C.i32((-1)))));
        (C.field(tmpobj,"object","recharged").value=C.i16(C.get_table_int_opt(L,C.literal("recharged"),0)));
        (C.field(tmpobj,"object","greased").value=C.i16(C.get_table_boolean_opt(L,C.literal("greased"),0)));
        (C.field(tmpobj,"object","broken").value=C.i16(C.get_table_boolean_opt(L,C.literal("broken"),0)));
        (C.field(tmpobj,"object","achievement").value=C.i16(C.get_table_boolean_opt(L,C.literal("achievement"),0)));
        get_table_xy_or_coord(L,oxAddress,oyAddress);
        (C.field(tmpobj,"object","id").value=C.i16(get_table_objtype(L)));
        (C.field(tmpobj,"object","class").value=C.i16(get_table_objclass(L)));
        (maybe_contents=1);
    }
    if(Number(!!(Number(C.cell(oxAddress,"long long").value==C.i64(C.i32((-1))))&&Number(C.cell(oyAddress,"long long").value==C.i64(C.i32((-1))))))) (C.field(tmpobj,"object","coord").value=(C.i64((16777216n|C.i64((0))))));
 else (C.field(tmpobj,"object","coord").value=C.i64((C.i64(((C.i64(((C.cell(oxAddress,"long long").value)&C.i64(255))))+(C.i64(((C.i64(((C.cell(oyAddress,"long long").value)&C.i64(255))))<<BigInt(16)))))))));
    if(Number(!!(Number(C.i32(C.field(tmpobj,"object","class").value)==C.i32((-1)))&&Number(C.i32(C.field(tmpobj,"object","id").value)>C.STRANGE_OBJECT)))) (C.field(tmpobj,"object","class").value=C.i16(C.field((C.objects+Number(C.field(tmpobj,"object","id").value)*C.sizes["struct objclass"]),"objclass","oc_class").value));
 else if(Number(!!(Number(C.i32(C.field(tmpobj,"object","class").value)>C.i32((-1)))&&Number(C.i32(C.field(tmpobj,"object","id").value)==C.STRANGE_OBJECT)))) (C.field(tmpobj,"object","id").value=C.i16(C.i32((-1))));
    if(Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(tmpobj,"object","id").value)==C.STATUE)||Number(C.i32(C.field(tmpobj,"object","id").value)==C.EGG)))||Number(C.i32(C.field(tmpobj,"object","id").value)==C.CORPSE)))||Number(C.i32(C.field(tmpobj,"object","id").value)==C.TIN)))||Number(C.i32(C.field(tmpobj,"object","id").value)==C.FIGURINE)))) {
        let pm=0;
        let nonpmobj=(C.i8(0));
        let i;
        let montype=C.get_table_str_opt(L,C.literal("montype"),0);
        if(montype) {
            if(Number(!!((Number(!!(Number(C.i32(C.field(tmpobj,"object","id").value)==C.TIN)&&(Number(!!(Number(!(C.strncmpi((montype),(C.literal("spinach")),C.i32((-1)))))||Number(!(C.strncmpi((montype),(C.literal("empty")),C.i32((-1)))))))))))||(Number(!!(Number(C.i32(C.field(tmpobj,"object","id").value)==C.EGG)&&Number(!(C.strncmpi((montype),(C.literal("empty")),C.i32((-1))))))))))) {
                /* id="tin",montype="empty" produces an empty tin */
                /* id="egg",montype="empty" produces a generic, unhatchable
                   egg rather than an "empty egg" */
                (C.field(tmpobj,"object","corpsenm").value=C.NON_PM);
                (C.field(tmpobj,"object","spe").value=C.i16((Number(!(C.strncmpi((montype),(C.literal("spinach")),C.i32((-1)))))?1:0)));
                (nonpmobj=(C.i8(1)));
            } else if(Number(!!(Number(C.strlen(montype)==C.u64(1))&&Number(C.def_char_to_monclass(C.cell(montype,"char").value)!=C.MAXMCLASSES)))) {
                (pm=C.mkclass(C.i8(C.def_char_to_monclass(C.cell(montype,"char").value)),C.i32((512|32768))));
            } else {
                for((i=C.LOW_PM);Number(i<C.NUMMONS);(()=>{const old=i;const next=C.i32((old+1));i=next;return old;})()) if(Number(!!(Number(!!(Number(!(C.strncmpi((C.cell((C.field((C.mons+Number(i)*C.sizes["struct permonst"]),"permonst","pmnames").address+Number(C.NEUTRAL)*8),"char *").value),(montype),C.i32((-1)))))||(Number(!!(Number(C.cell((C.field((C.mons+Number(i)*C.sizes["struct permonst"]),"permonst","pmnames").address+Number(C.MALE)*8),"char *").value!=0)&&Number(!(C.strncmpi((C.cell((C.field((C.mons+Number(i)*C.sizes["struct permonst"]),"permonst","pmnames").address+Number(C.MALE)*8),"char *").value),(montype),C.i32((-1))))))))))||(Number(!!(Number(C.cell((C.field((C.mons+Number(i)*C.sizes["struct permonst"]),"permonst","pmnames").address+Number(C.FEMALE)*8),"char *").value!=0)&&Number(!(C.strncmpi((C.cell((C.field((C.mons+Number(i)*C.sizes["struct permonst"]),"permonst","pmnames").address+Number(C.FEMALE)*8),"char *").value),(montype),C.i32((-1))))))))))) {
                    (pm=(C.mons+Number(i)*C.sizes["struct permonst"]));
                    break;
                }

            }
            C.free(montype);
            if(pm) (C.field(tmpobj,"object","corpsenm").value=C.i32((C.field((pm),"permonst","pmidx").value)));
 else if(Number(!(nonpmobj))) C.nhl_error(L,C.literal("Unknown montype"));
        }
        if(Number(!!(Number(C.i32(C.field(tmpobj,"object","id").value)==C.STATUE)||Number(C.i32(C.field(tmpobj,"object","id").value)==C.CORPSE)))) {
            let lflags=0;
            if(C.get_table_boolean_opt(L,C.literal("historic"),0)) (()=>{const old=lflags;const next=C.i32(C.i32(C.i32(old)|4));lflags=next;return next;})();
            if(C.get_table_boolean_opt(L,C.literal("male"),0)) (()=>{const old=lflags;const next=C.i32(C.i32(C.i32(old)|2));lflags=next;return next;})();
            if(C.get_table_boolean_opt(L,C.literal("female"),0)) (()=>{const old=lflags;const next=C.i32(C.i32(C.i32(old)|1));lflags=next;return next;})();
            (C.field(tmpobj,"object","spe").value=C.i16(lflags));
        } else if(Number(C.i32(C.field(tmpobj,"object","id").value)==C.EGG)) {
            (C.field(tmpobj,"object","spe").value=C.i16((C.get_table_boolean_opt(L,C.literal("laid_by_you"),0)?1:0)));
        } else if(Number(!(nonpmobj))) {
            /* tmpobj.spe is already set for nonpmobj */
            (C.field(tmpobj,"object","spe").value=C.i16(0));
        }
    }
    (quancnt=C.i64(((Number(C.i32(C.field(tmpobj,"object","id").value)>C.STRANGE_OBJECT))?C.field(tmpobj,"object","quan").value:0)));
    if(C.cell(C.container_idx,"int").value) (()=>{const slot=C.field(tmpobj,"object","containment");const old=slot.value;const next=C.i16(C.i32(C.i32(old)|1));slot.value=next;return next;})();
    if(maybe_contents) {
        C.lua_getfield(L,1,C.literal("contents"));
        if(Number(!((Number(C.lua_type(L,(C.i32((-1))))==0))))) (()=>{const slot=C.field(tmpobj,"object","containment");const old=slot.value;const next=C.i16(C.i32(C.i32(old)|2));slot.value=next;return next;})();
    }
    do {
        (otmp=create_object(tmpobj,C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value));
        (()=>{const old=quancnt;const next=C.i64((old-1n));quancnt=next;return old;})();
    } while(Number(!!((Number(quancnt>C.i64(0)))&&(Number(!!((Number(C.i32(C.field(tmpobj,"object","id").value)>C.STRANGE_OBJECT))&&Number(!(C.field((C.objects+Number(C.field(tmpobj,"object","id").value)*C.sizes["struct objclass"]),"objclass","oc_merge").value))))))));
    if(Number(C.lua_type(L,C.i32((-1)))==6)) {
        ((C.lua_rotate(L,(C.i32((-2))),C.i32((-1))),C.lua_settop(L,C.i32((C.i32((-(1)))-1)))));
        C.nhl_push_obj(L,otmp);
        C.nhl_pcall_handle(L,1,0,C.literal("lspo_object"),C.i32(C.NHLpa_panic));
    } else C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
    if(Number((C.i32((C.i32(C.field(tmpobj,"object","containment").value)&2)))!=0)) spo_pop_container();
    do {
        if(C.field(C.field(tmpobj,"object","name").address,"str_or_len","str").value) C.free((C.field(C.field(tmpobj,"object","name").address,"str_or_len","str").value));
    } while(0);
    C.nhl_push_obj(L,otmp);
    return 1;
    } finally {C.stackRestore(stackFrame); }
}

/* level_flags("noteleport", "mazelevel", ... ); */
export function lspo_level_flags(L)
{
    const stackFrame=C.stackSave();
    try {
    let argc=C.lua_gettop(L);
    let i;
    create_des_coder();
    if(Number(argc<1)) C.nhl_error(L,C.literal("expected string params"));
    for((i=1);Number(i<=argc);(()=>{const old=i;const next=C.i32((old+1));i=next;return old;})()) {
        let s=(C.luaL_checklstring(L,(i),0));
        if(Number(!(C.strncmpi((s),(C.literal("noteleport")),C.i32((-1)))))) (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","noteleport").value=C.u32(1));
 else if(Number(!(C.strncmpi((s),(C.literal("hardfloor")),C.i32((-1)))))) (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","hardfloor").value=C.u32(1));
 else if(Number(!(C.strncmpi((s),(C.literal("nommap")),C.i32((-1)))))) (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","nommap").value=C.u32(1));
 else if(Number(!(C.strncmpi((s),(C.literal("shortsighted")),C.i32((-1)))))) (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","shortsighted").value=C.u32(1));
 else if(Number(!(C.strncmpi((s),(C.literal("arboreal")),C.i32((-1)))))) (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","arboreal").value=C.u32(1));
 else if(Number(!(C.strncmpi((s),(C.literal("mazelevel")),C.i32((-1)))))) (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","is_maze_lev").value=C.u32(1));
 else if(Number(!(C.strncmpi((s),(C.literal("shroud")),C.i32((-1)))))) (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","hero_memory").value=C.u32(1));
 else if(Number(!(C.strncmpi((s),(C.literal("graveyard")),C.i32((-1)))))) (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","graveyard").value=C.u32(1));
 else if(Number(!(C.strncmpi((s),(C.literal("icedpools")),C.i32((-1)))))) (C.cell(C.icedpools,"signed char").value=C.i8(1));
 else if(Number(!(C.strncmpi((s),(C.literal("corrmaze")),C.i32((-1)))))) (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","corrmaze").value=C.u32(1));
 else if(Number(!(C.strncmpi((s),(C.literal("premapped")),C.i32((-1)))))) (C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","premapped").value=1);
 else if(Number(!(C.strncmpi((s),(C.literal("solidify")),C.i32((-1)))))) (C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","solidify").value=C.i8(1));
 else if(Number(!(C.strncmpi((s),(C.literal("sokoban")),C.i32((-1)))))) (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","sokoban_rules").value=C.u32(1));
 else if(Number(!(C.strncmpi((s),(C.literal("inaccessibles")),C.i32((-1)))))) (C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","check_inaccessibles").value=C.i8(1));
 else if(Number(!(C.strncmpi((s),(C.literal("noflipx")),C.i32((-1)))))) (()=>{const slot=C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","allow_flips");const old=slot.value;const next=C.i32(C.i32(C.i32(old)&C.i32((~2))));slot.value=next;return next;})();
 else if(Number(!(C.strncmpi((s),(C.literal("noflipy")),C.i32((-1)))))) (()=>{const slot=C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","allow_flips");const old=slot.value;const next=C.i32(C.i32(C.i32(old)&C.i32((~1))));slot.value=next;return next;})();
 else if(Number(!(C.strncmpi((s),(C.literal("noflip")),C.i32((-1)))))) (C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","allow_flips").value=0);
 else if(Number(!(C.strncmpi((s),(C.literal("temperate")),C.i32((-1)))))) (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","temperature").value=C.i8(0));
 else if(Number(!(C.strncmpi((s),(C.literal("hot")),C.i32((-1)))))) (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","temperature").value=C.i8(1));
 else if(Number(!(C.strncmpi((s),(C.literal("cold")),C.i32((-1)))))) (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","temperature").value=C.i8(C.i32((-1))));
 else if(Number(!(C.strncmpi((s),(C.literal("nomongen")),C.i32((-1)))))) (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","rndmongen").value=C.u32(0));
 else if(Number(!(C.strncmpi((s),(C.literal("nodeathdrops")),C.i32((-1)))))) (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","deathdrops").value=C.u32(0));
 else if(Number(!(C.strncmpi((s),(C.literal("noautosearch")),C.i32((-1)))))) (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","noautosearch").value=C.u32(1));
 else if(Number(!(C.strncmpi((s),(C.literal("fumaroles")),C.i32((-1)))))) (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","fumaroles").value=C.u32(1));
 else if(Number(!(C.strncmpi((s),(C.literal("stormy")),C.i32((-1)))))) (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","stormy").value=C.u32(1));
 else {
            /* svl.level.flags.sokoban_rules */
            let buf=C.stackAlloc((1*256));
            C.variadic(24,buf,C.literal("Unknown level flag %s"),s);
            C.nhl_error(L,buf);
        }
    }
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

/* level_init({ style = "solidfill", fg = " " }); */
/* level_init({ style = "mines", fg = ".", bg = "}",
                smoothed=true, joined=true, lit=0 }) */
export function lspo_level_init(L)
{
    const stackFrame=C.stackSave();
    try {
    const initstyles=C.staticData("lspo_level_init","initstyles",()=>[C.literal("solidfill"),C.literal("mazegrid"),C.literal("maze"),C.literal("rogue"),C.literal("mines"),C.literal("swamp"),0]);
    const initstyles2i=C.staticData("lspo_level_init","initstyles2i",()=>[C.LVLINIT_SOLIDFILL,C.LVLINIT_MAZEGRID,C.LVLINIT_MAZE,C.LVLINIT_ROGUE,C.LVLINIT_MINES,C.LVLINIT_SWAMP,0]);
    let init_lev=C.stackAlloc(C.sizes["lev_init"]);
    create_des_coder();
    C.lcheck_param_table(L);
    (C.cell(C.splev_init_present,"signed char").value=(C.i8(1)));
    (C.field(init_lev,"lev_init","init_style").value=C.i16(C.cell((initstyles2i+Number(C.get_table_option(L,C.literal("style"),C.literal("solidfill"),initstyles))*4),"int").value));
    (C.field(init_lev,"lev_init","fg").value=C.i8(C.get_table_mapchr_opt(L,C.literal("fg"),C.i8(C.ROOM))));
    (C.field(init_lev,"lev_init","bg").value=C.i8(C.get_table_mapchr_opt(L,C.literal("bg"),C.i8(C.INVALID_TYPE))));
    (C.field(init_lev,"lev_init","smoothed").value=C.i8(C.get_table_boolean_opt(L,C.literal("smoothed"),C.i32((C.i8(0))))));
    (C.field(init_lev,"lev_init","joined").value=C.i8(C.get_table_boolean_opt(L,C.literal("joined"),C.i32((C.i8(0))))));
    (C.field(init_lev,"lev_init","lit").value=C.i16(C.get_table_boolean_opt(L,C.literal("lit"),(C.i32((-1))))));
    (C.field(init_lev,"lev_init","walled").value=C.i16(C.get_table_boolean_opt(L,C.literal("walled"),C.i32((C.i8(0))))));
    (C.field(init_lev,"lev_init","filling").value=C.get_table_mapchr_opt(L,C.literal("filling"),C.i8(C.field(init_lev,"lev_init","fg").value)));
    (C.field(init_lev,"lev_init","corrwid").value=C.get_table_int_opt(L,C.literal("corrwid"),C.i32((-1))));
    (C.field(init_lev,"lev_init","wallthick").value=C.get_table_int_opt(L,C.literal("wallthick"),C.i32((-1))));
    (C.field(init_lev,"lev_init","rm_deadends").value=C.i8(Number(!(C.get_table_boolean_opt(L,C.literal("deadends"),C.i32((C.i8(1))))))));
    (C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","lvl_is_joined").value=C.field(init_lev,"lev_init","joined").value);
    if(Number(C.i32(C.field(init_lev,"lev_init","bg").value)==C.INVALID_TYPE)) (C.field(init_lev,"lev_init","bg").value=C.i8(((Number(C.i32(C.field(init_lev,"lev_init","init_style").value)==C.LVLINIT_SWAMP))?C.MOAT:C.STONE)));
    splev_initlev(init_lev);
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

/* engraving({ x = 1, y = 1, type="burn", text="Foo" }); */
/* engraving({ coord={1, 1}, type="burn", text="Foo" }); */
/* engraving({x,y}, "engrave", "Foo"); */
export function lspo_engraving(L)
{
    const stackFrame=C.stackSave();
    try {
    const engrtypes=C.staticData("lspo_engraving","engrtypes",()=>[C.literal("dust"),C.literal("engrave"),C.literal("burn"),C.literal("mark"),C.literal("blood"),0]);
    const engrtypes2i=C.staticData("lspo_engraving","engrtypes2i",()=>[1,2,3,4,5,0]);
    let etyp=1;
    let txt=0;
    let ecoord;
    let xAddress=C.stackAlloc(2); C.cell(xAddress,"short").value=C.i16(C.i32((-1))); let yAddress=C.stackAlloc(2); C.cell(yAddress,"short").value=C.i16(C.i32((-1)));
    let argc=C.lua_gettop(L);
    let guardobjs=(C.i8(0));
    let wipeout=(C.i8(1));
    let ep;
    create_des_coder();
    if(Number(argc==1)) {
        let exAddress=C.stackAlloc(8); let eyAddress=C.stackAlloc(8);
        C.lcheck_param_table(L);
        get_table_xy_or_coord(L,exAddress,eyAddress);
        (C.cell(xAddress,"short").value=C.i16(C.cell(exAddress,"long long").value));
        (C.cell(yAddress,"short").value=C.i16(C.cell(eyAddress,"long long").value));
        (etyp=C.cell((engrtypes2i+Number(C.get_table_option(L,C.literal("type"),C.literal("engrave"),engrtypes))*4),"int").value);
        (txt=C.get_table_str(L,C.literal("text")));
        (wipeout=C.i8(C.get_table_boolean_opt(L,C.literal("degrade"),C.i32((C.i8(1))))));
        (guardobjs=C.i8(C.get_table_boolean_opt(L,C.literal("guardobjects"),C.i32((C.i8(0))))));
    } else if(Number(argc==3)) {
        let exAddress=C.stackAlloc(8); let eyAddress=C.stackAlloc(8);
        get_coord(L,1,exAddress,eyAddress);
        (C.cell(xAddress,"short").value=C.i16(C.cell(exAddress,"long long").value));
        (C.cell(yAddress,"short").value=C.i16(C.cell(eyAddress,"long long").value));
        (etyp=C.cell((engrtypes2i+Number(C.luaL_checkoption(L,2,C.literal("engrave"),engrtypes))*4),"int").value);
        (txt=C.dupstr((C.luaL_checklstring(L,(3),0))));
    } else {
        C.nhl_error(L,C.literal("Wrong parameters"));
    }
    if(Number(!!(Number(C.i32(C.cell(xAddress,"short").value)==C.i32((-1)))&&Number(C.i32(C.cell(yAddress,"short").value)==C.i32((-1)))))) (ecoord=(C.i64((16777216n|C.i64((0))))));
 else (ecoord=C.i64((C.i32(((C.i32((C.i32((C.cell(xAddress,"short").value))&255)))+(C.i32(((C.i32((C.i32((C.cell(yAddress,"short").value))&255)))<<16))))))));
    get_location_coord(xAddress,yAddress,1,C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value,ecoord);
    C.make_engr_at(C.cell(xAddress,"short").value,C.cell(yAddress,"short").value,txt,0,0n,etyp);
    do {
        if(txt) C.free((txt));
    } while(0);
    (ep=C.engr_at(C.cell(xAddress,"short").value,C.cell(yAddress,"short").value));
    if(ep) {
        (C.field(ep,"engr","guardobjects").value=C.u32(guardobjs));
        (C.field(ep,"engr","nowipeout").value=C.u32(Number(!(wipeout))));
    }
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

export function lspo_mineralize(L)
{
    let gem_prob; let gold_prob; let kelp_moat; let kelp_pool;
    create_des_coder();
    C.lcheck_param_table(L);
    /* -1 produces default mineralize behavior */
    (gem_prob=C.get_table_int_opt(L,C.literal("gem_prob"),C.i32((-1))));
    (gold_prob=C.get_table_int_opt(L,C.literal("gold_prob"),C.i32((-1))));
    (kelp_moat=C.get_table_int_opt(L,C.literal("kelp_moat"),C.i32((-1))));
    (kelp_pool=C.get_table_int_opt(L,C.literal("kelp_pool"),C.i32((-1))));
    C.mineralize(kelp_pool,kelp_moat,gold_prob,gem_prob,(C.i8(1)));
    return 0;
}

export const room_types=C=>[[C.literal("ordinary"),C.OROOM],[C.literal("themed"),C.THEMEROOM],[C.literal("throne"),C.COURT],[C.literal("swamp"),C.SWAMP],[C.literal("vault"),C.VAULT],[C.literal("beehive"),C.BEEHIVE],[C.literal("morgue"),C.MORGUE],[C.literal("barracks"),C.BARRACKS],[C.literal("zoo"),C.ZOO],[C.literal("delphi"),C.DELPHI],[C.literal("temple"),C.TEMPLE],[C.literal("anthole"),C.ANTHOLE],[C.literal("cocknest"),C.COCKNEST],[C.literal("leprehall"),C.LEPREHALL],[C.literal("shop"),C.SHOPBASE],[C.literal("armor shop"),C.ARMORSHOP],[C.literal("scroll shop"),C.SCROLLSHOP],[C.literal("potion shop"),C.POTIONSHOP],[C.literal("weapon shop"),C.WEAPONSHOP],[C.literal("food shop"),C.FOODSHOP],[C.literal("ring shop"),C.RINGSHOP],[C.literal("wand shop"),C.WANDSHOP],[C.literal("tool shop"),C.TOOLSHOP],[C.literal("book shop"),C.BOOKSHOP],[C.literal("health food shop"),C.FODDERSHOP],[C.literal("candle shop"),C.CANDLESHOP],[0,0]];
export function get_mkroom_name(rtype)
{
    rtype=C.i32(rtype);
    let i;
    for((i=0);C.field((C.room_types+Number(i)*C.sizes["sp_lev_room_type"]),"sp_lev_room_type","name").value;(()=>{const old=i;const next=C.i32((old+1));i=next;return old;})()) if(Number(C.field((C.room_types+Number(i)*C.sizes["sp_lev_room_type"]),"sp_lev_room_type","type").value==rtype)) return C.field((C.room_types+Number(i)*C.sizes["sp_lev_room_type"]),"sp_lev_room_type","name").value;

    C.variadic(25,C.literal("get_mkroom_name unknown rtype %d"),rtype);
    return C.literal("unknown");
    /* not NULL */
}

export function get_table_roomtype_opt(L,name,defval)
{
    defval=C.i32(defval);
    let roomstr=C.get_table_str_opt(L,name,C.emptystr);
    let i; let res=defval;
    if(Number(!!(roomstr&&C.i32(C.cell(roomstr,"char").value)))) {
        for((i=0);C.field((C.room_types+Number(i)*C.sizes["sp_lev_room_type"]),"sp_lev_room_type","name").value;(()=>{const old=i;const next=C.i32((old+1));i=next;return old;})()) if(Number(!(C.strncmpi((roomstr),(C.field((C.room_types+Number(i)*C.sizes["sp_lev_room_type"]),"sp_lev_room_type","name").value),C.i32((-1)))))) {
            (res=C.field((C.room_types+Number(i)*C.sizes["sp_lev_room_type"]),"sp_lev_room_type","type").value);
            break;
        }

        if(Number(!(C.field((C.room_types+Number(i)*C.sizes["sp_lev_room_type"]),"sp_lev_room_type","name").value))) C.variadic(26,C.literal("Unknown room type '%s'"),roomstr);
    }
    do {
        if(roomstr) C.free((roomstr));
    } while(0);
    return res;
}

/* room({ type="ordinary", lit=1, x=3,y=3, xalign="center",yalign="center",
 *        w=11,h=9 }); */
/* room({ lit=1, coord={3,3}, xalign="center",yalign="center", w=11,h=9 }); */
/* room({ coord={3,3}, xalign="center",yalign="center", w=11,h=9,
 *        contents=function(room) ... end }); */
export function lspo_room(L)
{
    const stackFrame=C.stackSave();
    try {
    create_des_coder();
    if(Number(!!(C.i32(C.field(C.gi,"instance_globals_i","in_mk_themerooms").value)&&C.i32(C.field(C.gt,"instance_globals_t","themeroom_failed").value)))) return 0;
    C.lcheck_param_table(L);
    if(Number(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","n_subroom").value>5)) {
        C.variadic(27,C.literal("Too deeply nested rooms?!"));
    } else {
        const left_or_right=C.staticData("lspo_room","left_or_right",()=>[C.literal("left"),C.literal("half-left"),C.literal("center"),C.literal("half-right"),C.literal("right"),C.literal("none"),C.literal("random"),0]);
        const l_or_r2i=C.staticData("lspo_room","l_or_r2i",()=>[1,2,3,4,5,C.i32((-1)),C.i32((-1)),C.i32((-1))]);
        const top_or_bot=C.staticData("lspo_room","top_or_bot",()=>[C.literal("top"),C.literal("center"),C.literal("bottom"),C.literal("none"),C.literal("random"),0]);
        const t_or_b2i=C.staticData("lspo_room","t_or_b2i",()=>[1,3,5,C.i32((-1)),C.i32((-1)),C.i32((-1))]);
        let tmproom=C.stackAlloc(C.sizes["struct _room"]);
        let tmpcr;
        let rxAddress=C.stackAlloc(8); let ryAddress=C.stackAlloc(8);
        get_table_xy_or_coord(L,rxAddress,ryAddress);
        ((C.field(tmproom,"_room","x").value=C.i16(C.cell(rxAddress,"long long").value)),(C.field(tmproom,"_room","y").value=C.i16(C.cell(ryAddress,"long long").value)));
        if(Number(!!((Number(!!(Number(C.i32(C.field(tmproom,"_room","x").value)==C.i32((-1)))||Number(C.i32(C.field(tmproom,"_room","y").value)==C.i32((-1))))))&&Number(C.i32(C.field(tmproom,"_room","x").value)!=C.i32(C.field(tmproom,"_room","y").value))))) C.nhl_error(L,C.literal("Room must have both x and y"));
        (C.field(tmproom,"_room","w").value=C.i16(C.get_table_int_opt(L,C.literal("w"),C.i32((-1)))));
        (C.field(tmproom,"_room","h").value=C.i16(C.get_table_int_opt(L,C.literal("h"),C.i32((-1)))));
        if(Number(!!((Number(!!(Number(C.i32(C.field(tmproom,"_room","w").value)==C.i32((-1)))||Number(C.i32(C.field(tmproom,"_room","h").value)==C.i32((-1))))))&&Number(C.i32(C.field(tmproom,"_room","w").value)!=C.i32(C.field(tmproom,"_room","h").value))))) C.nhl_error(L,C.literal("Room must have both w and h"));
        (C.field(tmproom,"_room","xalign").value=C.i16(C.cell((l_or_r2i+Number(C.get_table_option(L,C.literal("xalign"),C.literal("random"),left_or_right))*4),"int").value));
        (C.field(tmproom,"_room","yalign").value=C.i16(C.cell((t_or_b2i+Number(C.get_table_option(L,C.literal("yalign"),C.literal("random"),top_or_bot))*4),"int").value));
        (C.field(tmproom,"_room","rtype").value=C.i16(get_table_roomtype_opt(L,C.literal("type"),C.OROOM)));
        (C.field(tmproom,"_room","chance").value=C.i16(C.get_table_int_opt(L,C.literal("chance"),100)));
        (C.field(tmproom,"_room","rlit").value=C.i16(C.get_table_int_opt(L,C.literal("lit"),C.i32((-1)))));
        /* theme rooms default to unfilled */
        (C.field(tmproom,"_room","needfill").value=C.i16(C.get_table_int_opt(L,C.literal("filled"),(C.i32(C.field(C.gi,"instance_globals_i","in_mk_themerooms").value)?0:1))));
        (C.field(tmproom,"_room","joined").value=C.i8(C.get_table_boolean_opt(L,C.literal("joined"),C.i32((C.i8(1))))));
        if(Number(!(C.cell((C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","failed_room").address+Number(C.i32((C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","n_subroom").value-1)))*1),"signed char").value))) {
            (tmpcr=build_room(tmproom,C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value));
            if(tmpcr) {
                let n=C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","n_subroom").value;
                (C.cell((C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","tmproomlist").address+Number(n)*8),"struct mkroom *").value=tmpcr);
                /* TRUE to get here... */
                (C.cell((C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","failed_room").address+Number(n)*1),"signed char").value=(C.i8(0)));
                /* added a subroom, make parent room irregular */
                if(C.cell((C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","tmproomlist").address+Number(C.i32((n-1)))*8),"struct mkroom *").value) (C.field(C.cell((C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","tmproomlist").address+Number(C.i32((n-1)))*8),"struct mkroom *").value,"mkroom","irregular").value=(C.i8(1)));
                (()=>{const slot=C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","n_subroom");const old=slot.value;const next=C.i32((old+1));slot.value=next;return old;})();
                update_croom();
                C.lua_getfield(L,1,C.literal("contents"));
                if(Number(C.lua_type(L,C.i32((-1)))==6)) {
                    ((C.lua_rotate(L,(C.i32((-2))),C.i32((-1))),C.lua_settop(L,C.i32((C.i32((-(1)))-1)))));
                    l_push_mkroom_table(L,tmpcr);
                    C.nhl_pcall_handle(L,1,0,C.literal("lspo_room"),C.i32(C.NHLpa_panic));
                } else C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
                spo_endroom(C.field(C.gc,"instance_globals_c","coder").value);
                add_doors_to_room(tmpcr);
                return 0;
            }
            if(C.field(C.gi,"instance_globals_i","in_mk_themerooms").value) (C.field(C.gt,"instance_globals_t","themeroom_failed").value=(C.i8(1)));
        }
        /* failed to create parent room, so fail this too */
    }
    (C.cell((C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","tmproomlist").address+Number(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","n_subroom").value)*8),"struct mkroom *").value=0);
    (C.cell((C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","failed_room").address+Number(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","n_subroom").value)*1),"signed char").value=(C.i8(1)));
    (()=>{const slot=C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","n_subroom");const old=slot.value;const next=C.i32((old+1));slot.value=next;return old;})();
    update_croom();
    spo_endroom(C.field(C.gc,"instance_globals_c","coder").value);
    if(C.field(C.gi,"instance_globals_i","in_mk_themerooms").value) (C.field(C.gt,"instance_globals_t","themeroom_failed").value=(C.i8(1)));
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

export function spo_endroom(coder)
{
    if(Number(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","n_subroom").value>1)) {
        (()=>{const slot=C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","n_subroom");const old=slot.value;const next=C.i32((old-1));slot.value=next;return old;})();
        (C.cell((C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","tmproomlist").address+Number(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","n_subroom").value)*8),"struct mkroom *").value=0);
        (C.cell((C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","failed_room").address+Number(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","n_subroom").value)*1),"signed char").value=(C.i8(1)));
    } else {
        /* no subroom, get out of top-level room */
        /* Need to ensure xstart/ystart/xsize/ysize have something sensible,
           in case there's some stuff to be created outside the outermost
           room, and there's no MAP. */
        if(Number(!!(Number(C.i32(C.field(C.gx,"instance_globals_x","xsize").value)<=1)&&Number(C.i32(C.field(C.gy,"instance_globals_y","ysize").value)<=1)))) reset_xystart_size();
    }
    update_croom();
}

/* callback for is_ok_location.
   stairs generated at random location shouldn't overwrite special terrain */
export function good_stair_loc(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let typ=C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value;
    return C.i8((Number(!!(Number(!!(Number(C.i32(typ)==C.ROOM)||Number(C.i32(typ)==C.CORR)))||Number(C.i32(typ)==C.ICE)))));
}

export function l_create_stairway(L,using_ladder)
{
    using_ladder=C.i8(using_ladder);
    const stackFrame=C.stackSave();
    try {
    const stairdirs=C.staticData("l_create_stairway","stairdirs",()=>[C.literal("down"),C.literal("up"),0]);
    const stairdirs2i=C.staticData("l_create_stairway","stairdirs2i",()=>[0,1]);
    let argc=C.lua_gettop(L);
    let xAddress=C.stackAlloc(2); C.cell(xAddress,"short").value=C.i16(C.i32((-1))); let yAddress=C.stackAlloc(2); C.cell(yAddress,"short").value=C.i16(C.i32((-1)));
    let badtrap;
    let scoord;
    let up=0;
    /* default is down */
    let ltype=C.lua_type(L,1);
    create_des_coder();
    if(Number(!!(Number(argc==1)&&Number(ltype==5)))) {
        let axAddress=C.stackAlloc(8); C.cell(axAddress,"long long").value=C.i64(C.i32((-1))); let ayAddress=C.stackAlloc(8); C.cell(ayAddress,"long long").value=C.i64(C.i32((-1)));
        C.lcheck_param_table(L);
        get_table_xy_or_coord(L,axAddress,ayAddress);
        (up=C.cell((stairdirs2i+Number(C.get_table_option(L,C.literal("dir"),C.literal("down"),stairdirs))*4),"int").value);
        (C.cell(xAddress,"short").value=C.i16(C.cell(axAddress,"long long").value));
        (C.cell(yAddress,"short").value=C.i16(C.cell(ayAddress,"long long").value));
    } else {
        let ixAddress=C.stackAlloc(8); C.cell(ixAddress,"long long").value=C.i64(C.i32((-1))); let iyAddress=C.stackAlloc(8); C.cell(iyAddress,"long long").value=C.i64(C.i32((-1)));
        if(Number(!!(Number(argc>0)&&Number(ltype==4)))) {
            (up=C.cell((stairdirs2i+Number(C.luaL_checkoption(L,1,C.literal("down"),stairdirs))*4),"int").value);
            ((C.lua_rotate(L,(1),C.i32((-1))),C.lua_settop(L,C.i32((C.i32((-(1)))-1)))));
        }
        C.nhl_get_xy_params(L,ixAddress,iyAddress);
        (C.cell(xAddress,"short").value=C.i16(C.cell(ixAddress,"long long").value));
        (C.cell(yAddress,"short").value=C.i16(C.cell(iyAddress,"long long").value));
    }
    if(Number(!!(Number(C.i32(C.cell(xAddress,"short").value)==C.i32((-1)))&&Number(C.i32(C.cell(yAddress,"short").value)==C.i32((-1)))))) {
        set_ok_location_func(C.functionPointer("good_stair_loc"));
        (scoord=(C.i64((16777216n|C.i64((0))))));
    } else (scoord=C.i64((C.i32(((C.i32((C.i32((C.cell(xAddress,"short").value))&255)))+(C.i32(((C.i32((C.i32((C.cell(yAddress,"short").value))&255)))<<16))))))));
    get_location_coord(xAddress,yAddress,1,C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value,scoord);
    set_ok_location_func(0);
    if(Number(((badtrap=C.t_at(C.cell(xAddress,"short").value,C.cell(yAddress,"short").value)))!=0)) C.deltrap(badtrap);
    (C.cell(((C.SpLev_Map+Number(C.cell(xAddress,"short").value)*(1*21))+Number(C.cell(yAddress,"short").value)*1),"char").value=C.i8(1));
    if(using_ladder) {
        (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"short").value)*C.sizes["struct rm"]),"rm","typ").value=C.i8(C.LADDER));
        if(up) {
            let dest=C.stackAlloc(C.sizes["struct d_level"]);
            (C.field(dest,"d_level","dnum").value=C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value);
            (C.field(dest,"d_level","dlevel").value=C.i16(C.i32((C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dlevel").value)-1))));
            C.stairway_add(C.cell(xAddress,"short").value,C.cell(yAddress,"short").value,(C.i8(1)),(C.i8(1)),dest);
            (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"short").value)*C.sizes["struct rm"]),"rm","flags").value=C.u32(1));
        } else {
            let dest=C.stackAlloc(C.sizes["struct d_level"]);
            (C.field(dest,"d_level","dnum").value=C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value);
            (C.field(dest,"d_level","dlevel").value=C.i16(C.i32((C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dlevel").value)+1))));
            C.stairway_add(C.cell(xAddress,"short").value,C.cell(yAddress,"short").value,(C.i8(0)),(C.i8(1)),dest);
            (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"short").value)*C.sizes["struct rm"]),"rm","flags").value=C.u32(2));
        }
    } else {
        C.mkstairs(C.cell(xAddress,"short").value,C.cell(yAddress,"short").value,C.i8(up),C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value,C.i8(Number(!((C.i64((scoord&16777216n)))))));
    }
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

/* stair("up"); */
/* stair({ dir = "down" }); */
/* stair({ dir = "down", x = 4, y = 7 }); */
/* stair({ dir = "down", coord = {x,y} }); */
/* stair("down", 4, 7); */
/* TODO: stair(selection, "down"); */
/* TODO: stair("up", {x,y}); */
export function lspo_stair(L)
{
    return l_create_stairway(L,(C.i8(0)));
}

/* ladder("down"); */
/* ladder("up", 6,10); */
/* ladder({ x=11, y=05, dir="down" }); */
export function lspo_ladder(L)
{
    return l_create_stairway(L,(C.i8(1)));
}

/* grave(); */
/* grave(x,y, "text"); */
/* grave({ x = 1, y = 1 }); */
/* grave({ x = 1, y = 1, text = "Foo" }); */
/* grave({ coord = {1, 1}, text = "Foo" }); */
export function lspo_grave(L)
{
    const stackFrame=C.stackSave();
    try {
    let argc=C.lua_gettop(L);
    let xAddress=C.stackAlloc(2); let yAddress=C.stackAlloc(2);
    let scoord;
    let axAddress=C.stackAlloc(8); let ayAddress=C.stackAlloc(8);
    let txt;
    create_des_coder();
    if(Number(argc==3)) {
        (C.cell(xAddress,"short").value=C.i16((C.cell(axAddress,"long long").value=C.luaL_checkinteger(L,1))));
        (C.cell(yAddress,"short").value=C.i16((C.cell(ayAddress,"long long").value=C.luaL_checkinteger(L,2))));
        (txt=C.dupstr((C.luaL_checklstring(L,(3),0))));
    } else {
        C.lcheck_param_table(L);
        get_table_xy_or_coord(L,axAddress,ayAddress);
        ((C.cell(xAddress,"short").value=C.i16(C.cell(axAddress,"long long").value)),(C.cell(yAddress,"short").value=C.i16(C.cell(ayAddress,"long long").value)));
        (txt=C.get_table_str_opt(L,C.literal("text"),0));
    }
    if(Number(!!(Number(C.i32(C.cell(xAddress,"short").value)==C.i32((-1)))&&Number(C.i32(C.cell(yAddress,"short").value)==C.i32((-1)))))) (scoord=(C.i64((16777216n|C.i64((0))))));
 else (scoord=C.i64((C.i64(((C.i64(((C.cell(axAddress,"long long").value)&C.i64(255))))+(C.i64(((C.i64(((C.cell(ayAddress,"long long").value)&C.i64(255))))<<BigInt(16)))))))));
    get_location_coord(xAddress,yAddress,1,C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value,scoord);
    if(Number(!!(C.isok(C.cell(xAddress,"short").value,C.cell(yAddress,"short").value)&&Number(!(C.t_at(C.cell(xAddress,"short").value,C.cell(yAddress,"short").value)))))) {
        (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"short").value)*C.sizes["struct rm"]),"rm","typ").value=C.i8(C.GRAVE));
        C.make_grave(C.cell(xAddress,"short").value,C.cell(yAddress,"short").value,txt);
        /* note: 'txt' might be Null */
    }
    do {
        if(txt) C.free((txt));
    } while(0);
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

/* altar({ x=NN, y=NN, align=ALIGNMENT, type=SHRINE }); */
/* des.altar({ coord = {5, 10}, align="noalign", type="altar" }); */
export function lspo_altar(L)
{
    const stackFrame=C.stackSave();
    try {
    const shrines=C.staticData("lspo_altar","shrines",()=>[C.literal("altar"),C.literal("shrine"),C.literal("sanctum"),0]);
    const shrines2i=C.staticData("lspo_altar","shrines2i",()=>[0,1,2,0]);
    let tmpaltar=C.stackAlloc(C.sizes["altar"]);
    let xAddress=C.stackAlloc(8); let yAddress=C.stackAlloc(8);
    let acoord;
    let shrine;
    let al;
    create_des_coder();
    C.lcheck_param_table(L);
    get_table_xy_or_coord(L,xAddress,yAddress);
    (al=get_table_align(L));
    (shrine=C.cell((shrines2i+Number(C.get_table_option(L,C.literal("type"),C.literal("altar"),shrines))*4),"int").value);
    if(Number(!!(Number(C.cell(xAddress,"long long").value==C.i64(C.i32((-1))))&&Number(C.cell(yAddress,"long long").value==C.i64(C.i32((-1))))))) (acoord=(C.i64((16777216n|C.i64((0))))));
 else (acoord=C.i64((C.i64(((C.i64(((C.cell(xAddress,"long long").value)&C.i64(255))))+(C.i64(((C.i64(((C.cell(yAddress,"long long").value)&C.i64(255))))<<BigInt(16)))))))));
    (C.field(tmpaltar,"altar","coord").value=acoord);
    (C.field(tmpaltar,"altar","sp_amask").value=C.u32(al));
    (C.field(tmpaltar,"altar","shrine").value=C.i16(shrine));
    create_altar(tmpaltar,C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value);
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

export const trap_types=C=>[[C.literal("arrow"),C.ARROW_TRAP],[C.literal("dart"),C.DART_TRAP],[C.literal("falling rock"),C.ROCKTRAP],[C.literal("board"),C.SQKY_BOARD],[C.literal("bear"),C.BEAR_TRAP],[C.literal("land mine"),C.LANDMINE],[C.literal("rolling boulder"),C.ROLLING_BOULDER_TRAP],[C.literal("sleep gas"),C.SLP_GAS_TRAP],[C.literal("rust"),C.RUST_TRAP],[C.literal("fire"),C.FIRE_TRAP],[C.literal("pit"),C.PIT],[C.literal("spiked pit"),C.SPIKED_PIT],[C.literal("hole"),C.HOLE],[C.literal("trap door"),C.TRAPDOOR],[C.literal("teleport"),C.TELEP_TRAP],[C.literal("level teleport"),C.LEVEL_TELEP],[C.literal("magic portal"),C.MAGIC_PORTAL],[C.literal("web"),C.WEB],[C.literal("statue"),C.STATUE_TRAP],[C.literal("magic"),C.MAGIC_TRAP],[C.literal("anti magic"),C.ANTI_MAGIC],[C.literal("polymorph"),C.POLY_TRAP],[C.literal("vibrating square"),C.VIBRATING_SQUARE],[C.literal("random"),C.i32((-1))],[0,C.NO_TRAP]];
export function get_table_traptype_opt(L,name,defval)
{
    defval=C.i32(defval);
    let trapstr=C.get_table_str_opt(L,name,C.emptystr);
    let i; let res=defval;
    if(Number(!!(trapstr&&C.i32(C.cell(trapstr,"char").value)))) {
        for((i=0);C.field((C.trap_types+Number(i)*C.sizes["sp_lev_trap_type"]),"sp_lev_trap_type","name").value;(()=>{const old=i;const next=C.i32((old+1));i=next;return old;})()) if(Number(!(C.strncmpi((trapstr),(C.field((C.trap_types+Number(i)*C.sizes["sp_lev_trap_type"]),"sp_lev_trap_type","name").value),C.i32((-1)))))) {
            (res=C.field((C.trap_types+Number(i)*C.sizes["sp_lev_trap_type"]),"sp_lev_trap_type","type").value);
            break;
        }

    }
    do {
        if(trapstr) C.free((trapstr));
    } while(0);
    return res;
}

export function get_trapname_bytype(ttyp)
{
    ttyp=C.i32(ttyp);
    let i;
    for((i=0);C.field((C.trap_types+Number(i)*C.sizes["sp_lev_trap_type"]),"sp_lev_trap_type","name").value;(()=>{const old=i;const next=C.i32((old+1));i=next;return old;})()) if(Number(ttyp==C.field((C.trap_types+Number(i)*C.sizes["sp_lev_trap_type"]),"sp_lev_trap_type","type").value)) return C.field((C.trap_types+Number(i)*C.sizes["sp_lev_trap_type"]),"sp_lev_trap_type","name").value;

    return 0;
}

export function get_traptype_byname(trapname)
{
    let i;
    for((i=0);C.field((C.trap_types+Number(i)*C.sizes["sp_lev_trap_type"]),"sp_lev_trap_type","name").value;(()=>{const old=i;const next=C.i32((old+1));i=next;return old;})()) if(Number(!(C.strncmpi((trapname),(C.field((C.trap_types+Number(i)*C.sizes["sp_lev_trap_type"]),"sp_lev_trap_type","name").value),C.i32((-1)))))) return C.field((C.trap_types+Number(i)*C.sizes["sp_lev_trap_type"]),"sp_lev_trap_type","type").value;

    return C.NO_TRAP;
}

/* trap({ type = "hole", x = 1, y = 1 }); */
/* trap({ type = "web", spider_on_web = 0 }); */
/* trap("hole", 3, 4); */
/* trap("level teleport", {5, 8}); */
/* trap("rust") */
/* trap(); */
export function lspo_trap(L)
{
    const stackFrame=C.stackSave();
    try {
    let tmptrap=C.stackAlloc(C.sizes["spltrap"]);
    let xAddress=C.stackAlloc(8); let yAddress=C.stackAlloc(8);
    let argc=C.lua_gettop(L);
    create_des_coder();
    (C.field(tmptrap,"spltrap","spider_on_web").value=(C.i8(1)));
    (C.field(tmptrap,"spltrap","seen").value=(C.i8(0)));
    (C.field(tmptrap,"spltrap","novictim").value=(C.i8(0)));
    if(Number(!!(Number(argc==1)&&Number(C.lua_type(L,1)==4)))) {
        let trapstr=(C.luaL_checklstring(L,(1),0));
        (C.field(tmptrap,"spltrap","type").value=C.i16(get_traptype_byname(trapstr)));
        (C.cell(xAddress,"long long").value=(C.cell(yAddress,"long long").value=C.i64(C.i32((-1)))));
    } else if(Number(!!(Number(!!(Number(argc==2)&&Number(C.lua_type(L,1)==4)))&&Number(C.lua_type(L,2)==5)))) {
        let trapstr=(C.luaL_checklstring(L,(1),0));
        (C.field(tmptrap,"spltrap","type").value=C.i16(get_traptype_byname(trapstr)));
        get_coord(L,2,xAddress,yAddress);
    } else if(Number(argc==3)) {
        let trapstr=(C.luaL_checklstring(L,(1),0));
        (C.field(tmptrap,"spltrap","type").value=C.i16(get_traptype_byname(trapstr)));
        (C.cell(xAddress,"long long").value=C.luaL_checkinteger(L,2));
        (C.cell(yAddress,"long long").value=C.luaL_checkinteger(L,3));
    } else {
        C.lcheck_param_table(L);
        get_table_xy_or_coord(L,xAddress,yAddress);
        (C.field(tmptrap,"spltrap","type").value=C.i16(get_table_traptype_opt(L,C.literal("type"),C.i32((-1)))));
        (C.field(tmptrap,"spltrap","spider_on_web").value=C.i8(C.get_table_boolean_opt(L,C.literal("spider_on_web"),1)));
        (C.field(tmptrap,"spltrap","seen").value=C.i8(C.get_table_boolean_opt(L,C.literal("seen"),C.i32((C.i8(0))))));
        (C.field(tmptrap,"spltrap","novictim").value=C.i8(Number(!(C.get_table_boolean_opt(L,C.literal("victim"),C.i32((C.i8(1))))))));
        C.lua_getfield(L,C.i32((-1)),C.literal("launchfrom"));
        if(Number(C.lua_type(L,C.i32((-1)))==5)) {
            let lxAddress=C.stackAlloc(8); C.cell(lxAddress,"long long").value=C.i64(C.i32((-1))); let lyAddress=C.stackAlloc(8); C.cell(lyAddress,"long long").value=C.i64(C.i32((-1)));
            get_coord(L,C.i32((-1)),lxAddress,lyAddress);
            C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
            (C.field(C.field(C.gl,"instance_globals_l","launchplace").address,"launchplace","x").value=C.i16(C.cell(lxAddress,"long long").value));
            (C.field(C.field(C.gl,"instance_globals_l","launchplace").address,"launchplace","y").value=C.i16(C.cell(lyAddress,"long long").value));
        } else C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
        C.lua_getfield(L,C.i32((-1)),C.literal("teledest"));
        if(Number(C.lua_type(L,C.i32((-1)))==5)) {
            let lxAddress=C.stackAlloc(8); C.cell(lxAddress,"long long").value=C.i64(C.i32((-1))); let lyAddress=C.stackAlloc(8); C.cell(lyAddress,"long long").value=C.i64(C.i32((-1)));
            get_coord(L,C.i32((-1)),lxAddress,lyAddress);
            C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
            (C.field(C.field(C.gl,"instance_globals_l","launchplace").address,"launchplace","x").value=C.i16(C.cell(lxAddress,"long long").value));
            (C.field(C.field(C.gl,"instance_globals_l","launchplace").address,"launchplace","y").value=C.i16(C.cell(lyAddress,"long long").value));
        } else C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
    }
    if(Number(C.i32(C.field(tmptrap,"spltrap","type").value)==C.NO_TRAP)) C.nhl_error(L,C.literal("Unknown trap type"));
    if(Number(!!(Number(C.cell(xAddress,"long long").value==C.i64(C.i32((-1))))&&Number(C.cell(yAddress,"long long").value==C.i64(C.i32((-1))))))) (C.field(tmptrap,"spltrap","coord").value=(C.i64((16777216n|C.i64((0))))));
 else (C.field(tmptrap,"spltrap","coord").value=C.i64((C.i64(((C.i64(((C.cell(xAddress,"long long").value)&C.i64(255))))+(C.i64(((C.i64(((C.cell(yAddress,"long long").value)&C.i64(255))))<<BigInt(16)))))))));
    create_trap(tmptrap,C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value);
    (C.field(C.field(C.gl,"instance_globals_l","launchplace").address,"launchplace","x").value=(C.field(C.field(C.gl,"instance_globals_l","launchplace").address,"launchplace","y").value=C.i16(0)));
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

/* gold(500, 3,5); */
/* gold(500, {5, 6}); */
/* gold({ amount = 500, x = 2, y = 5 });*/
/* gold({ amount = 500, coord = {2, 5} });*/
/* gold(); */
export function lspo_gold(L)
{
    const stackFrame=C.stackSave();
    try {
    let argc=C.lua_gettop(L);
    let xAddress=C.stackAlloc(2); let yAddress=C.stackAlloc(2);
    let amount;
    let gcoord;
    let gldxAddress=C.stackAlloc(8); let gldyAddress=C.stackAlloc(8);
    create_des_coder();
    if(Number(argc==3)) {
        (amount=C.i64(C.luaL_checkinteger(L,1)));
        (C.cell(xAddress,"short").value=C.i16((C.cell(gldxAddress,"long long").value=C.luaL_checkinteger(L,2))));
        (C.cell(yAddress,"short").value=C.i16((C.cell(gldyAddress,"long long").value=C.luaL_checkinteger(L,3))));
    } else if(Number(!!(Number(argc==2)&&Number(C.lua_type(L,2)==5)))) {
        (amount=C.i64(C.luaL_checkinteger(L,1)));
        get_coord(L,2,gldxAddress,gldyAddress);
        (C.cell(xAddress,"short").value=C.i16(C.cell(gldxAddress,"long long").value));
        (C.cell(yAddress,"short").value=C.i16(C.cell(gldyAddress,"long long").value));
    } else if(Number(!!(Number(argc==0)||(Number(!!(Number(argc==1)&&Number(C.lua_type(L,1)==5))))))) {
        C.lcheck_param_table(L);
        (amount=C.i64(C.get_table_int_opt(L,C.literal("amount"),C.i32((-1)))));
        get_table_xy_or_coord(L,gldxAddress,gldyAddress);
        ((C.cell(xAddress,"short").value=C.i16(C.cell(gldxAddress,"long long").value)),(C.cell(yAddress,"short").value=C.i16(C.cell(gldyAddress,"long long").value)));
    } else {
        C.nhl_error(L,C.literal("Wrong parameters"));
        /*NOTREACHED*/
        return 0;
    }
    if(Number(!!(Number(C.i32(C.cell(xAddress,"short").value)==C.i32((-1)))&&Number(C.i32(C.cell(yAddress,"short").value)==C.i32((-1)))))) (gcoord=(C.i64((16777216n|C.i64((0))))));
 else (gcoord=C.i64((C.i64(((C.i64(((C.cell(gldxAddress,"long long").value)&C.i64(255))))+(C.i64(((C.i64(((C.cell(gldyAddress,"long long").value)&C.i64(255))))<<BigInt(16)))))))));
    get_location_coord(xAddress,yAddress,1,C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value,gcoord);
    if(Number(amount<C.i64(0))) (amount=C.i64(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),4518,(C.literal("lspo_gold"))),C.rnd(200))):C.rnd(200)))));
    C.mkgold(amount,C.cell(xAddress,"short").value,C.cell(yAddress,"short").value);
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

/* corridor({ srcroom=1, srcdoor=2, srcwall="north",
 *            destroom=2, destdoor=1, destwall="west" }); */
export function lspo_corridor(L)
{
    const stackFrame=C.stackSave();
    try {
    const walldirs=C.staticData("lspo_corridor","walldirs",()=>[C.literal("all"),C.literal("random"),C.literal("north"),C.literal("west"),C.literal("east"),C.literal("south"),0]);
    const walldirs2i=C.staticData("lspo_corridor","walldirs2i",()=>[(C.i32((C.i32((C.i32((1|2))|4))|8))),C.i32((-1)),1,8,4,2,0]);
    let tc=C.stackAlloc(C.sizes["corridor"]);
    create_des_coder();
    C.lcheck_param_table(L);
    (C.field(C.field(tc,"corridor","src").address,"sp_lev_corridor_end","room").value=C.i16(C.get_table_int(L,C.literal("srcroom"))));
    (C.field(C.field(tc,"corridor","src").address,"sp_lev_corridor_end","door").value=C.i16(C.get_table_int(L,C.literal("srcdoor"))));
    (C.field(C.field(tc,"corridor","src").address,"sp_lev_corridor_end","wall").value=C.i16(C.cell((walldirs2i+Number(C.get_table_option(L,C.literal("srcwall"),C.literal("all"),walldirs))*4),"int").value));
    (C.field(C.field(tc,"corridor","dest").address,"sp_lev_corridor_end","room").value=C.i16(C.get_table_int(L,C.literal("destroom"))));
    (C.field(C.field(tc,"corridor","dest").address,"sp_lev_corridor_end","door").value=C.i16(C.get_table_int(L,C.literal("destdoor"))));
    (C.field(C.field(tc,"corridor","dest").address,"sp_lev_corridor_end","wall").value=C.i16(C.cell((walldirs2i+Number(C.get_table_option(L,C.literal("destwall"),C.literal("all"),walldirs))*4),"int").value));
    create_corridor(tc);
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

/* random_corridors(); */
export function lspo_random_corridors(L)
{
    const stackFrame=C.stackSave();
    try {
    let tc=C.stackAlloc(C.sizes["corridor"]);
    create_des_coder();
    (C.field(C.field(tc,"corridor","src").address,"sp_lev_corridor_end","room").value=C.i16(C.i32((-1))));
    (C.field(C.field(tc,"corridor","src").address,"sp_lev_corridor_end","door").value=C.i16(C.i32((-1))));
    (C.field(C.field(tc,"corridor","src").address,"sp_lev_corridor_end","wall").value=C.i16(C.i32((-1))));
    (C.field(C.field(tc,"corridor","dest").address,"sp_lev_corridor_end","room").value=C.i16(C.i32((-1))));
    (C.field(C.field(tc,"corridor","dest").address,"sp_lev_corridor_end","door").value=C.i16(C.i32((-1))));
    (C.field(C.field(tc,"corridor","dest").address,"sp_lev_corridor_end","wall").value=C.i16(C.i32((-1))));
    create_corridor(tc);
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

/* Choose a single random W_* direction. */
export function random_wdir()
{
    const wdirs=C.staticData("random_wdir","wdirs",()=>[C.i16(1),C.i16(2),C.i16(4),C.i16(8)]);
    return C.cell((wdirs+Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),4581,(C.literal("random_wdir"))),C.rn2(4))):C.rn2(4))))*2),"short").value;
}

export const floodfillchk_match_under_typ=C=>0;
export function floodfillchk_match_under(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    return (Number(C.i32(C.cell(C.floodfillchk_match_under_typ,"signed char").value)==C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)));
}

export function set_floodfillchk_match_under(typ)
{
    typ=C.i16(typ);
    (C.cell(C.floodfillchk_match_under_typ,"signed char").value=C.i8(typ));
    C.set_selection_floodfillchk(C.functionPointer("floodfillchk_match_under"));
}

export function floodfillchk_match_accessible(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    return (Number(!!(Number(!!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))>=C.DOOR))||Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.SDOOR)))||Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.SCORR))));
}

/* change map location terrain type during level creation */
export function sel_set_ter(x,y,arg)
{
    x=C.i16(x);
    y=C.i16(y);
    const stackFrame=C.stackSave();
    try {
    let terr=C.stackAlloc(C.sizes["terrain"]);
    C.copyRecord(terr,arg,C.sizes["terrain"]);
    if(Number(!(C.set_levltyp_lit(x,y,C.i8(C.field(terr,"terrain","ter").value),C.i8(C.field(terr,"terrain","tlit").value))))) return;
    /* TODO: move this below into set_levltyp? */
    /* handle doors and secret doors */
    if(Number(!!(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.SDOOR)||(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))==C.DOOR))))) {
        if(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.SDOOR)) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value=C.u32(4));
        if(Number(!!(C.i32(x)&&(Number(!!((Number(!!(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(x)-1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))&&Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(x)-1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))<=C.DBWALL))))||C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(x)-1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","horizontal").value))))))) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","horizontal").value=C.u32(1));
    } else if(Number(!!(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.HWALL)||Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.IRONBARS)))) {
        (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","horizontal").value=C.u32(1));
    } else if(Number(!!(C.i32(C.cell(C.splev_init_present,"signed char").value)&&Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.ICE)))) {
        (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value=C.u32((C.i32(C.cell(C.icedpools,"signed char").value)?8:16)));
    } else if(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.CLOUD)) {
        C.del_engr_at(x,y);
        /* clouds cannot have engravings */
    }
    } finally {C.stackRestore(stackFrame); }
}

export function sel_set_feature(x,y,arg)
{
    x=C.i16(x);
    y=C.i16(y);
    if(Number(!(C.isok(x,y)))) {
        /*EXTRA_SANITY_CHECKS*/
        return;
    }
    if((Number(!!(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))>=C.STAIRS)&&Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))<=C.ALTAR))))) return;
    (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value=C.i8((C.cell(arg,"int").value)));
}

export function sel_set_door(dx,dy,arg)
{
    dx=C.i16(dx);
    dy=C.i16(dy);
    let typ=C.cell(arg,"short").value;
    let x=dx; let y=dy;
    if(Number(!!(Number(!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))==C.DOOR))))&&Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)!=C.SDOOR)))) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value=C.i8(((C.i32((C.i32(typ)&32)))?C.SDOOR:C.DOOR)));
    if(C.i32((C.i32(typ)&32))) {
        (()=>{const old=typ;const next=C.i16(C.i32(C.i32(old)&C.i32((~32))));typ=next;return next;})();
        if(Number(C.i32(typ)<4)) (typ=C.i16(4));
    }
    set_door_orientation(C.i32(x),C.i32(y));
    /* set/clear levl[x][y].horizontal */
    (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value=C.u32(typ));
    (C.cell(((C.SpLev_Map+Number(x)*(1*21))+Number(y)*1),"char").value=C.i8(1));
}

/* door({ x = 1, y = 1, state = "nodoor" }); */
/* door({ coord = {1, 1}, state = "nodoor" }); */
/* door({ wall = "north", pos = 3, state="secret" }); */
/* door("nodoor", 1, 2); */
export function lspo_door(L)
{
    const stackFrame=C.stackSave();
    try {
    const doorstates=C.staticData("lspo_door","doorstates",()=>[C.literal("random"),C.literal("open"),C.literal("closed"),C.literal("locked"),C.literal("nodoor"),C.literal("broken"),C.literal("secret"),0]);
    const doorstates2i=C.staticData("lspo_door","doorstates2i",()=>[C.i32((-1)),2,4,8,0,1,32]);
    let msk;
    let xAddress=C.stackAlloc(2); let yAddress=C.stackAlloc(2);
    let typAddress=C.stackAlloc(2);
    let argc=C.lua_gettop(L);
    create_des_coder();
    if(Number(argc==3)) {
        (msk=C.cell((doorstates2i+Number(C.luaL_checkoption(L,1,C.literal("random"),doorstates))*4),"int").value);
        (C.cell(xAddress,"short").value=C.i16(C.luaL_checkinteger(L,2)));
        (C.cell(yAddress,"short").value=C.i16(C.luaL_checkinteger(L,3)));
    } else {
        let dxAddress=C.stackAlloc(8); let dyAddress=C.stackAlloc(8);
        C.lcheck_param_table(L);
        get_table_xy_or_coord(L,dxAddress,dyAddress);
        ((C.cell(xAddress,"short").value=C.i16(C.cell(dxAddress,"long long").value)),(C.cell(yAddress,"short").value=C.i16(C.cell(dyAddress,"long long").value)));
        (msk=C.cell((doorstates2i+Number(C.get_table_option(L,C.literal("state"),C.literal("random"),doorstates))*4),"int").value);
    }
    (C.cell(typAddress,"short").value=C.i16(((Number(msk==C.i32((-1))))?rnddoor():C.i32(C.i16(msk)))));
    if(Number(!!(Number(C.i32(C.cell(xAddress,"short").value)==C.i32((-1)))&&Number(C.i32(C.cell(yAddress,"short").value)==C.i32((-1)))))) {
        const walldirs=C.staticData("lspo_door","walldirs",()=>[C.literal("all"),C.literal("random"),C.literal("north"),C.literal("west"),C.literal("east"),C.literal("south"),0]);
        /* Note that "random" is also W_ANY, because create_door just wants a
         * mask of acceptable walls */
        const walldirs2i=C.staticData("lspo_door","walldirs2i",()=>[(C.i32((C.i32((C.i32((1|2))|4))|8))),(C.i32((C.i32((C.i32((1|2))|4))|8))),1,8,4,2,0]);
        let tmpd=C.stackAlloc(C.sizes["room_door"]);
        (C.field(tmpd,"room_door","secret").value=C.i16(((Number(C.i32(C.cell(typAddress,"short").value)==32))?1:0)));
        (C.field(tmpd,"room_door","mask").value=C.i16(msk));
        (C.field(tmpd,"room_door","pos").value=C.i16(C.get_table_int_opt(L,C.literal("pos"),C.i32((-1)))));
        (C.field(tmpd,"room_door","wall").value=C.i16(C.cell((walldirs2i+Number(C.get_table_option(L,C.literal("wall"),C.literal("all"),walldirs))*4),"int").value));
        create_door(tmpd,C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value);
    } else {
        /*selection_iterate(sel, sel_set_door, (genericptr_t) &typ);*/
        get_location_coord(xAddress,yAddress,16,C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value,C.i64((C.i32(((C.i32((C.i32((C.cell(xAddress,"short").value))&255)))+(C.i32(((C.i32((C.i32((C.cell(yAddress,"short").value))&255)))<<16))))))));
        if(Number(!(C.isok(C.cell(xAddress,"short").value,C.cell(yAddress,"short").value)))) {
            C.nhl_error(L,C.literal("door coord not ok"));
            /*NOTREACHED*/
            return 0;
        }
        sel_set_door(C.cell(xAddress,"short").value,C.cell(yAddress,"short").value,typAddress);
    }
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

export function l_table_getset_feature_flag(L,x,y,name,flag)
{
    x=C.i32(x);
    y=C.i32(y);
    flag=C.i32(flag);
    let val=C.get_table_boolean_opt(L,name,C.i32((-2)));
    if(Number(val!=C.i32((-2)))) {
        if(Number(val==C.i32((-1)))) (val=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),4749,(C.literal("l_table_getset_feature_flag"))),C.rn2(2))):C.rn2(2))));
        if(val) (()=>{const slot=C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags");const old=slot.value;const next=C.u32(C.i32(C.i32(old)|flag));slot.value=next;return next;})();
 else (()=>{const slot=C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags");const old=slot.value;const next=C.u32(C.i32(C.i32(old)&C.i32((~flag))));slot.value=next;return next;})();
    }
}

/* guts of nhl_abs_coord; convert a coordinate relative to a map or room
 * into an absolute coordinate in svl.level.locations.
 *
 * If there is no enclosing map or room, the coordinates are assumed to be
 * absolute already.
 *
 * Part of the reason this is a function is to make it clearer in the calling
 * code that this conversion is what is intended.
 *
 * NOTE: if the coordinates are going to get passed to one of the get_location
 * family of functions, this should NOT be called; get_location already makes
 * an adjustment like this. (What this function supports which get_location
 * doesn't is the input coordinates being negative. get_location will treat
 * that as "level designer wants a random coordinate".) */
export function cvt_to_abscoord(x,y)
{
    /* since commit 99715e0, xstart and ystart are only relevant in mklev when
     * maps are being used, and 0 otherwise. It is possible in the future that
     * map positions and dimensions can be saved and retrieved outside of
     * mklev which would reintroduce nonzero xstart/ystart/xsiz/ysiz, but
     * this is not currently implemented, so this function can be assumed to
     * have no effect outside of mklev.
     */
    if(Number(!!(C.field(C.gc,"instance_globals_c","coder").value&&C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value))) {
        (()=>{const slot=C.cell(x,"short");const old=slot.value;const next=C.i16(C.i32(C.i32(old)+C.i32(C.field(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value,"mkroom","lx").value)));slot.value=next;return next;})();
        (()=>{const slot=C.cell(y,"short");const old=slot.value;const next=C.i16(C.i32(C.i32(old)+C.i32(C.field(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value,"mkroom","ly").value)));slot.value=next;return next;})();
    } else {
        (()=>{const slot=C.cell(x,"short");const old=slot.value;const next=C.i16(C.i32(C.i32(old)+C.i32(C.field(C.gx,"instance_globals_x","xstart").value)));slot.value=next;return next;})();
        (()=>{const slot=C.cell(y,"short");const old=slot.value;const next=C.i16(C.i32(C.i32(old)+C.i32(C.field(C.gy,"instance_globals_y","ystart").value)));slot.value=next;return next;})();
    }
}

/* inverse of cvt_to_abscoord; turn an absolute svl.level.locations coordinate
 * into one relative to the current map or room. */
export function cvt_to_relcoord(x,y)
{
    if(Number(!!(C.field(C.gc,"instance_globals_c","coder").value&&C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value))) {
        (()=>{const slot=C.cell(x,"short");const old=slot.value;const next=C.i16(C.i32(C.i32(old)-C.i32(C.field(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value,"mkroom","lx").value)));slot.value=next;return next;})();
        (()=>{const slot=C.cell(y,"short");const old=slot.value;const next=C.i16(C.i32(C.i32(old)-C.i32(C.field(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value,"mkroom","ly").value)));slot.value=next;return next;})();
    } else {
        (()=>{const slot=C.cell(x,"short");const old=slot.value;const next=C.i16(C.i32(C.i32(old)-C.i32(C.field(C.gx,"instance_globals_x","xstart").value)));slot.value=next;return next;})();
        (()=>{const slot=C.cell(y,"short");const old=slot.value;const next=C.i16(C.i32(C.i32(old)-C.i32(C.field(C.gy,"instance_globals_y","ystart").value)));slot.value=next;return next;})();
    }
}

/* convert map-relative coordinate to absolute.
  local ax,ay = nh.abscoord(rx, ry);
  local pt = nh.abscoord({ x = 10, y = 5 });
 */
export function nhl_abs_coord(L)
{
    const stackFrame=C.stackSave();
    try {
    let argc=C.lua_gettop(L);
    let xAddress=C.stackAlloc(2); C.cell(xAddress,"short").value=C.i16(C.i32((-1))); let yAddress=C.stackAlloc(2); C.cell(yAddress,"short").value=C.i16(C.i32((-1)));
    if(Number(argc==2)) {
        (C.cell(xAddress,"short").value=C.i16(C.lua_tointegerx(L,(1),0)));
        (C.cell(yAddress,"short").value=C.i16(C.lua_tointegerx(L,(2),0)));
        cvt_to_abscoord(xAddress,yAddress);
        C.lua_pushinteger(L,C.i64(C.cell(xAddress,"short").value));
        C.lua_pushinteger(L,C.i64(C.cell(yAddress,"short").value));
        return 2;
    } else if(Number(!!(Number(argc==1)&&Number(C.lua_type(L,1)==5)))) {
        (C.cell(xAddress,"short").value=C.i16(C.get_table_int(L,C.literal("x"))));
        (C.cell(yAddress,"short").value=C.i16(C.get_table_int(L,C.literal("y"))));
        cvt_to_abscoord(xAddress,yAddress);
        C.lua_createtable(L,0,0);
        C.nhl_add_table_entry_int(L,C.literal("x"),C.i64(C.cell(xAddress,"short").value));
        C.nhl_add_table_entry_int(L,C.literal("y"),C.i64(C.cell(yAddress,"short").value));
        return 1;
    } else {
        C.nhl_error(L,C.literal("nhl_abs_coord: Wrong args"));
        /*NOTREACHED*/
        return 0;
    }
    } finally {C.stackRestore(stackFrame); }
}

/* feature("fountain", x, y); */
/* feature("fountain", {x,y}); */
/* feature({ type="fountain", x=NN, y=NN }); */
/* feature({ type="fountain", coord={NN, NN} }); */
/* feature({ type="tree", coord={NN, NN}, swarm=true, looted=false }); */
export function lspo_feature(L)
{
    const stackFrame=C.stackSave();
    try {
    const features=C.staticData("lspo_feature","features",()=>[C.literal("fountain"),C.literal("sink"),C.literal("pool"),C.literal("throne"),C.literal("tree"),0]);
    const features2i=C.staticData("lspo_feature","features2i",()=>[C.FOUNTAIN,C.SINK,C.POOL,C.THRONE,C.TREE,C.STONE]);
    let xAddress=C.stackAlloc(2); let yAddress=C.stackAlloc(2);
    let typAddress=C.stackAlloc(4);
    let argc=C.lua_gettop(L);
    let can_have_flags=(C.i8(0));
    let fcoord;
    let humidity;
    create_des_coder();
    if(Number(!!(Number(argc==1)&&Number(C.lua_type(L,1)==4)))) {
        (C.cell(typAddress,"int").value=C.cell((features2i+Number(C.luaL_checkoption(L,1,0,features))*4),"int").value);
        (C.cell(xAddress,"short").value=(C.cell(yAddress,"short").value=C.i16(C.i32((-1)))));
    } else if(Number(!!(Number(!!(Number(argc==2)&&Number(C.lua_type(L,1)==4)))&&Number(C.lua_type(L,2)==5)))) {
        let fxAddress=C.stackAlloc(8); let fyAddress=C.stackAlloc(8);
        (C.cell(typAddress,"int").value=C.cell((features2i+Number(C.luaL_checkoption(L,1,0,features))*4),"int").value);
        get_coord(L,2,fxAddress,fyAddress);
        (C.cell(xAddress,"short").value=C.i16(C.cell(fxAddress,"long long").value));
        (C.cell(yAddress,"short").value=C.i16(C.cell(fyAddress,"long long").value));
    } else if(Number(argc==3)) {
        (C.cell(typAddress,"int").value=C.cell((features2i+Number(C.luaL_checkoption(L,1,0,features))*4),"int").value);
        (C.cell(xAddress,"short").value=C.i16(C.luaL_checkinteger(L,2)));
        (C.cell(yAddress,"short").value=C.i16(C.luaL_checkinteger(L,3)));
    } else {
        let fxAddress=C.stackAlloc(8); let fyAddress=C.stackAlloc(8);
        C.lcheck_param_table(L);
        get_table_xy_or_coord(L,fxAddress,fyAddress);
        ((C.cell(xAddress,"short").value=C.i16(C.cell(fxAddress,"long long").value)),(C.cell(yAddress,"short").value=C.i16(C.cell(fyAddress,"long long").value)));
        (C.cell(typAddress,"int").value=C.cell((features2i+Number(C.get_table_option(L,C.literal("type"),0,features))*4),"int").value);
        (can_have_flags=(C.i8(1)));
    }
    if(Number(!!(Number(C.i32(C.cell(xAddress,"short").value)==C.i32((-1)))&&Number(C.i32(C.cell(yAddress,"short").value)==C.i32((-1)))))) {
        (fcoord=(C.i64((16777216n|C.i64((0))))));
        (humidity=1);
        /* pick a regular space, no rock or other furniture */
    } else {
        (fcoord=C.i64((C.i32(((C.i32((C.i32((C.cell(xAddress,"short").value))&255)))+(C.i32(((C.i32((C.i32((C.cell(yAddress,"short").value))&255)))<<16))))))));
        (humidity=16);
        /* assume the author knows what they're doing */
    }
    get_location_coord(xAddress,yAddress,humidity,C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value,fcoord);
    if(Number(C.cell(typAddress,"int").value==C.STONE)) C.variadic(28,C.literal("feature has unknown type param."));
 else sel_set_feature(C.cell(xAddress,"short").value,C.cell(yAddress,"short").value,typAddress);
    if(Number(!!(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"short").value)*C.sizes["struct rm"]),"rm","typ").value)!=C.cell(typAddress,"int").value)||Number(!(can_have_flags))))) return 0;
    switch(C.cell(typAddress,"int").value) {
        default:
            break;
        case (C.FOUNTAIN):
            l_table_getset_feature_flag(L,C.i32(C.cell(xAddress,"short").value),C.i32(C.cell(yAddress,"short").value),C.literal("looted"),1);
        l_table_getset_feature_flag(L,C.i32(C.cell(xAddress,"short").value),C.i32(C.cell(yAddress,"short").value),C.literal("warned"),2);
        break;
        case (C.SINK):
            l_table_getset_feature_flag(L,C.i32(C.cell(xAddress,"short").value),C.i32(C.cell(yAddress,"short").value),C.literal("pudding"),1);
        l_table_getset_feature_flag(L,C.i32(C.cell(xAddress,"short").value),C.i32(C.cell(yAddress,"short").value),C.literal("dishwasher"),2);
        l_table_getset_feature_flag(L,C.i32(C.cell(xAddress,"short").value),C.i32(C.cell(yAddress,"short").value),C.literal("ring"),4);
        break;
        case (C.THRONE):
            l_table_getset_feature_flag(L,C.i32(C.cell(xAddress,"short").value),C.i32(C.cell(yAddress,"short").value),C.literal("looted"),1);
        break;
        case (C.TREE):
            l_table_getset_feature_flag(L,C.i32(C.cell(xAddress,"short").value),C.i32(C.cell(yAddress,"short").value),C.literal("looted"),1);
        l_table_getset_feature_flag(L,C.i32(C.cell(xAddress,"short").value),C.i32(C.cell(yAddress,"short").value),C.literal("swarm"),2);
        break;
    }
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

/* gas_cloud({ selection=SELECTION }); */
/* gas_cloud({ selection=SELECTION, damage=N }); */
/* gas_cloud({ selection=SELECTION, damage=N, ttl=N }); */
export function lspo_gas_cloud(L)
{
    const stackFrame=C.stackSave();
    try {
    let x=C.i16(0); let y=C.i16(0);
    let sel=0;
    let argc=C.lua_gettop(L);
    let damage=0;
    let ttl=C.i32((-2));
    create_des_coder();
    if(Number(!!(Number(argc==1)&&Number(C.lua_type(L,1)==5)))) {
        let txAddress=C.stackAlloc(8); let tyAddress=C.stackAlloc(8);
        let reg;
        C.lcheck_param_table(L);
        get_table_xy_or_coord(L,txAddress,tyAddress);
        ((x=C.i16(C.cell(txAddress,"long long").value)),(y=C.i16(C.cell(tyAddress,"long long").value)));
        if(Number(!!(Number(C.cell(txAddress,"long long").value==C.i64(C.i32((-1))))&&Number(C.cell(tyAddress,"long long").value==C.i64(C.i32((-1))))))) {
            C.lua_getfield(L,1,C.literal("selection"));
            (sel=C.l_selection_check(L,C.i32((-1))));
            C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
        }
        (damage=C.get_table_int_opt(L,C.literal("damage"),0));
        (ttl=C.get_table_int_opt(L,C.literal("ttl"),C.i32((-2))));
        if(Number(!(sel))) {
            (reg=C.create_gas_cloud(x,y,1,damage));
        } else (reg=C.create_gas_cloud_selection(sel,damage));
        if(Number(ttl>C.i32((-2)))) (C.field(reg,"NhRegion","ttl").value=C.i64(ttl));
    } else {
        C.nhl_error(L,C.literal("wrong parameters"));
    }
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

/*
 * [lit_state: 1 On, 0 Off, -1 random, -2 leave as-is]
 * terrain({ x=NN, y=NN, typ=MAPCHAR, lit=lit_state });
 * terrain({ coord={X, Y}, typ=MAPCHAR, lit=lit_state });
 * terrain({ selection=SELECTION, typ=MAPCHAR, lit=lit_state });
 * terrain( SELECTION, MAPCHAR [, lit_state ] );
 * terrain({x,y}, MAPCHAR);
 * terrain(x,y, MAPCHAR);
 */
export function lspo_terrain(L)
{
    const stackFrame=C.stackSave();
    try {
    let tmpterrain=C.stackAlloc(C.sizes["terrain"]);
    let xAddress=C.stackAlloc(2); C.cell(xAddress,"short").value=C.i16(0); let yAddress=C.stackAlloc(2); C.cell(yAddress,"short").value=C.i16(0);
    let sel=0;
    let argc=C.lua_gettop(L);
    create_des_coder();
    (C.field(tmpterrain,"terrain","tlit").value=C.i16(C.i32((-2))));
    (C.field(tmpterrain,"terrain","ter").value=C.i16(C.INVALID_TYPE));
    if(Number(argc==1)) {
        let txAddress=C.stackAlloc(8); let tyAddress=C.stackAlloc(8);
        C.lcheck_param_table(L);
        get_table_xy_or_coord(L,txAddress,tyAddress);
        ((C.cell(xAddress,"short").value=C.i16(C.cell(txAddress,"long long").value)),(C.cell(yAddress,"short").value=C.i16(C.cell(tyAddress,"long long").value)));
        if(Number(!!(Number(C.cell(txAddress,"long long").value==C.i64(C.i32((-1))))&&Number(C.cell(tyAddress,"long long").value==C.i64(C.i32((-1))))))) {
            C.lua_getfield(L,1,C.literal("selection"));
            (sel=C.l_selection_check(L,C.i32((-1))));
            C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
        }
        (C.field(tmpterrain,"terrain","ter").value=C.i16(C.get_table_mapchr(L,C.literal("typ"))));
        (C.field(tmpterrain,"terrain","tlit").value=C.i16(C.get_table_int_opt(L,C.literal("lit"),C.i32((-2)))));
    } else if(Number(!!(Number(!!(Number(argc==2)&&Number(C.lua_type(L,1)==5)))&&Number(C.lua_type(L,2)==4)))) {
        let txAddress=C.stackAlloc(8); let tyAddress=C.stackAlloc(8);
        (C.field(tmpterrain,"terrain","ter").value=C.i16(C.check_mapchr((C.luaL_checklstring(L,(2),0)))));
        C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
        get_coord(L,1,txAddress,tyAddress);
        (C.cell(xAddress,"short").value=C.i16(C.cell(txAddress,"long long").value));
        (C.cell(yAddress,"short").value=C.i16(C.cell(tyAddress,"long long").value));
    } else if(Number(argc==2)) {
        (sel=C.l_selection_check(L,1));
        (C.field(tmpterrain,"terrain","ter").value=C.i16(C.check_mapchr((C.luaL_checklstring(L,(2),0)))));
    } else if(Number(argc==3)) {
        (C.cell(xAddress,"short").value=C.i16(C.luaL_checkinteger(L,1)));
        (C.cell(yAddress,"short").value=C.i16(C.luaL_checkinteger(L,2)));
        (C.field(tmpterrain,"terrain","ter").value=C.i16(C.check_mapchr((C.luaL_checklstring(L,(3),0)))));
    } else {
        C.nhl_error(L,C.literal("wrong parameters"));
    }
    if(Number(C.i32(C.field(tmpterrain,"terrain","ter").value)==C.INVALID_TYPE)) C.nhl_error(L,C.literal("Erroneous map char"));
    if(sel) {
        C.selection_iterate(sel,C.functionPointer("sel_set_ter"),tmpterrain);
    } else {
        get_location_coord(xAddress,yAddress,16,C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value,C.i64((C.i32(((C.i32((C.i32((C.cell(xAddress,"short").value))&255)))+(C.i32(((C.i32((C.i32((C.cell(yAddress,"short").value))&255)))<<16))))))));
        if(Number(!(C.isok(C.cell(xAddress,"short").value,C.cell(yAddress,"short").value)))) {
            C.nhl_error(L,C.literal("terrain coord not ok"));
            /*NOTREACHED*/
            return 0;
        }
        sel_set_ter(C.cell(xAddress,"short").value,C.cell(yAddress,"short").value,tmpterrain);
    }
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

/*
 * replace_terrain({ x1=NN,y1=NN, x2=NN,y2=NN, fromterrain=MAPCHAR,
 *                   toterrain=MAPCHAR, lit=N, chance=NN });
 * replace_terrain({ region={x1,y1, x2,y2}, fromterrain=MAPCHAR,
 *                   toterrain=MAPCHAR, lit=N, chance=NN });
 * replace_terrain({ selection=selection.area(2,5, 40,10),
 *                   fromterrain=MAPCHAR, toterrain=MAPCHAR });
 * replace_terrain({ selection=SEL, mapfragment=[[...]],
 *                   toterrain=MAPCHAR });
 */
export function lspo_replace_terrain(L)
{
    const stackFrame=C.stackSave();
    try {
    let totyp; let fromtyp;
    let mfAddress=C.stackAlloc(8); C.cell(mfAddress,"struct mapfragment *").value=0;
    let sel=0;
    let freesel=(C.i8(0));
    let x; let y;
    let x1Address=C.stackAlloc(8); let y1Address=C.stackAlloc(8); let x2Address=C.stackAlloc(8); let y2Address=C.stackAlloc(8);
    let chance;
    let tolit;
    let rect=C.stackAlloc(C.sizes["struct nhrect"]); C.copyRecord(rect,C.field(C.cg,"const_globals","zeroNhRect").address,C.sizes["struct nhrect"]);
    create_des_coder();
    C.lcheck_param_table(L);
    (totyp=C.i16(C.get_table_mapchr(L,C.literal("toterrain"))));
    if(Number(C.i32(totyp)>=C.MAX_TYPE)) return 0;
    (fromtyp=C.i16(C.get_table_mapchr_opt(L,C.literal("fromterrain"),C.i8(C.INVALID_TYPE))));
    if(Number(C.i32(fromtyp)==C.INVALID_TYPE)) {
        let err;
        let tmpstr=C.get_table_str(L,C.literal("mapfragment"));
        (C.cell(mfAddress,"struct mapfragment *").value=mapfrag_fromstr(tmpstr));
        C.free(tmpstr);
        if(Number(((err=mapfrag_error(C.cell(mfAddress,"struct mapfragment *").value)))!=(0))) {
            C.nhl_error(L,err);
            /*NOTREACHED*/
        }
    }
    (chance=C.get_table_int_opt(L,C.literal("chance"),100));
    (tolit=C.get_table_int_opt(L,C.literal("lit"),C.i32((-2))));
    (C.cell(x1Address,"long long").value=C.i64(C.get_table_int_opt(L,C.literal("x1"),C.i32((-1)))));
    (C.cell(y1Address,"long long").value=C.i64(C.get_table_int_opt(L,C.literal("y1"),C.i32((-1)))));
    (C.cell(x2Address,"long long").value=C.i64(C.get_table_int_opt(L,C.literal("x2"),C.i32((-1)))));
    (C.cell(y2Address,"long long").value=C.i64(C.get_table_int_opt(L,C.literal("y2"),C.i32((-1)))));
    if(Number(!!(Number(!!(Number(!!(Number(C.cell(x1Address,"long long").value==C.i64(C.i32((-1))))&&Number(C.cell(y1Address,"long long").value==C.i64(C.i32((-1))))))&&Number(C.cell(x2Address,"long long").value==C.i64(C.i32((-1))))))&&Number(C.cell(y2Address,"long long").value==C.i64(C.i32((-1))))))) {
        get_table_region(L,C.literal("region"),x1Address,y1Address,x2Address,y2Address,(C.i8(1)));
    }
    if(Number(!!(Number(!!(Number(!!(Number(C.cell(x1Address,"long long").value==C.i64(C.i32((-1))))&&Number(C.cell(y1Address,"long long").value==C.i64(C.i32((-1))))))&&Number(C.cell(x2Address,"long long").value==C.i64(C.i32((-1))))))&&Number(C.cell(y2Address,"long long").value==C.i64(C.i32((-1))))))) {
        C.lua_getfield(L,1,C.literal("selection"));
        if(Number(C.lua_type(L,C.i32((-1)))!=0)) (sel=C.l_selection_check(L,C.i32((-1))));
        C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
    }
    if(Number(!(sel))) {
        (sel=C.selection_new());
        (freesel=(C.i8(1)));
        if(Number(!!(Number(!!(Number(!!(Number(C.cell(x1Address,"long long").value==C.i64(C.i32((-1))))&&Number(C.cell(y1Address,"long long").value==C.i64(C.i32((-1))))))&&Number(C.cell(x2Address,"long long").value==C.i64(C.i32((-1))))))&&Number(C.cell(y2Address,"long long").value==C.i64(C.i32((-1))))))) {
            C.selection_clear(sel,1);
        } else {
            let rx1Address=C.stackAlloc(2); let ry1Address=C.stackAlloc(2); let rx2Address=C.stackAlloc(2); let ry2Address=C.stackAlloc(2);
            ((((C.cell(rx1Address,"short").value=C.i16(C.cell(x1Address,"long long").value)),(C.cell(ry1Address,"short").value=C.i16(C.cell(y1Address,"long long").value))),(C.cell(rx2Address,"short").value=C.i16(C.cell(x2Address,"long long").value))),(C.cell(ry2Address,"short").value=C.i16(C.cell(y2Address,"long long").value)));
            get_location(rx1Address,ry1Address,C.u32(16),C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value);
            get_location(rx2Address,ry2Address,C.u32(16),C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value);
            for((x=C.i16(((Number(C.i32((C.cell(rx1Address,"short").value))>(0))?C.i32((C.cell(rx1Address,"short").value)):(0)))));Number(C.i32(x)<=((Number(C.i32((C.cell(rx2Address,"short").value))<(C.i32((80-1))))?C.i32((C.cell(rx2Address,"short").value)):(C.i32((80-1))))));(()=>{const old=x;const next=C.i16((old+1));x=next;return old;})()) for((y=C.i16(((Number(C.i32((C.cell(ry1Address,"short").value))>(0))?C.i32((C.cell(ry1Address,"short").value)):(0)))));Number(C.i32(y)<=((Number(C.i32((C.cell(ry2Address,"short").value))<(C.i32((21-1))))?C.i32((C.cell(ry2Address,"short").value)):(C.i32((21-1))))));(()=>{const old=y;const next=C.i16((old+1));y=next;return old;})()) C.selection_setpoint(x,y,sel,1);


        }
    }
    C.selection_getbounds(sel,rect);
    for((x=C.i16(((Number((1)>C.i32((C.field(rect,"nhrect","lx").value)))?(1):C.i32((C.field(rect,"nhrect","lx").value))))));Number(C.i32(x)<=C.i32(C.field(rect,"nhrect","hx").value));(()=>{const old=x;const next=C.i16((old+1));x=next;return old;})()) for((y=C.field(rect,"nhrect","ly").value);Number(C.i32(y)<=C.i32(C.field(rect,"nhrect","hy").value));(()=>{const old=y;const next=C.i16((old+1));y=next;return old;})()) if(C.selection_getpoint(x,y,sel)) {
        if(C.cell(mfAddress,"struct mapfragment *").value) {
            if(Number(!!(C.i32(mapfrag_match(C.cell(mfAddress,"struct mapfragment *").value,C.i32(x),C.i32(y)))&&Number((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),5127,(C.literal("lspo_replace_terrain"))),C.rn2(100))):C.rn2(100))))<chance)))) C.set_levltyp_lit(x,y,C.i8(totyp),C.i8(tolit));
        } else {
            if(Number(!!((Number(!!((Number(!!(Number(C.i32(fromtyp)==C.MATCH_WALL)&&(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))<=C.DBWALL)))))||Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.i32(fromtyp)))))&&Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),5132,(C.literal("lspo_replace_terrain"))),C.rn2(100))):C.rn2(100)))<chance)))) C.set_levltyp_lit(x,y,C.i8(totyp),C.i8(tolit));
        }
    }


    if(freesel) C.selection_free(sel,(C.i8(1)));
    mapfrag_free(mfAddress);
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

export function generate_way_out_method(nx,ny,ov)
{
    nx=C.i16(nx);
    ny=C.i16(ny);
    const stackFrame=C.stackSave();
    try {
    const escapeitems=C.staticData("generate_way_out_method","escapeitems",()=>[C.PICK_AXE,C.DWARVISH_MATTOCK,C.WAN_DIGGING,C.WAN_TELEPORTATION,C.SCR_TELEPORTATION,C.RIN_TELEPORTATION]);
    let ov2=C.selection_new(); let ov3;
    let xAddress=C.stackAlloc(2); let yAddress=C.stackAlloc(2);
    let res=(C.i8(1));
    gotitdone: {
        C.selection_floodfill(ov2,nx,ny,(C.i8(1)));
        (ov3=C.selection_clone(ov2));
        /* try to make a secret door */
        while(C.selection_rndcoord(ov3,xAddress,yAddress,(C.i8(1)))) {
            if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(C.isok(C.i16(C.i32((C.i32(C.cell(xAddress,"short").value)+1))),C.cell(yAddress,"short").value)&&Number(!(C.selection_getpoint(C.i16(C.i32((C.i32(C.cell(xAddress,"short").value)+1))),C.cell(yAddress,"short").value,ov)))))&&(Number(!!(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(C.cell(xAddress,"short").value)+1)))*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"short").value)*C.sizes["struct rm"]),"rm","typ").value))&&Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(C.cell(xAddress,"short").value)+1)))*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"short").value)*C.sizes["struct rm"]),"rm","typ").value))<=C.DBWALL))))))&&C.isok(C.i16(C.i32((C.i32(C.cell(xAddress,"short").value)+2))),C.cell(yAddress,"short").value)))&&C.i32(C.selection_getpoint(C.i16(C.i32((C.i32(C.cell(xAddress,"short").value)+2))),C.cell(yAddress,"short").value,ov))))&&(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(C.cell(xAddress,"short").value)+2)))*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"short").value)*C.sizes["struct rm"]),"rm","typ").value))>=C.DOOR))))) {
                (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(C.cell(xAddress,"short").value)+1)))*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"short").value)*C.sizes["struct rm"]),"rm","typ").value=C.i8(C.SDOOR));
                break gotitdone;
            }
            if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(C.isok(C.i16(C.i32((C.i32(C.cell(xAddress,"short").value)-1))),C.cell(yAddress,"short").value)&&Number(!(C.selection_getpoint(C.i16(C.i32((C.i32(C.cell(xAddress,"short").value)-1))),C.cell(yAddress,"short").value,ov)))))&&(Number(!!(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(C.cell(xAddress,"short").value)-1)))*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"short").value)*C.sizes["struct rm"]),"rm","typ").value))&&Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(C.cell(xAddress,"short").value)-1)))*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"short").value)*C.sizes["struct rm"]),"rm","typ").value))<=C.DBWALL))))))&&C.isok(C.i16(C.i32((C.i32(C.cell(xAddress,"short").value)-2))),C.cell(yAddress,"short").value)))&&C.i32(C.selection_getpoint(C.i16(C.i32((C.i32(C.cell(xAddress,"short").value)-2))),C.cell(yAddress,"short").value,ov))))&&(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(C.cell(xAddress,"short").value)-2)))*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"short").value)*C.sizes["struct rm"]),"rm","typ").value))>=C.DOOR))))) {
                (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(C.cell(xAddress,"short").value)-1)))*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"short").value)*C.sizes["struct rm"]),"rm","typ").value=C.i8(C.SDOOR));
                break gotitdone;
            }
            if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(C.isok(C.cell(xAddress,"short").value,C.i16(C.i32((C.i32(C.cell(yAddress,"short").value)+1))))&&Number(!(C.selection_getpoint(C.cell(xAddress,"short").value,C.i16(C.i32((C.i32(C.cell(yAddress,"short").value)+1))),ov)))))&&(Number(!!(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(C.cell(yAddress,"short").value)+1)))*C.sizes["struct rm"]),"rm","typ").value))&&Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(C.cell(yAddress,"short").value)+1)))*C.sizes["struct rm"]),"rm","typ").value))<=C.DBWALL))))))&&C.isok(C.cell(xAddress,"short").value,C.i16(C.i32((C.i32(C.cell(yAddress,"short").value)+2))))))&&C.i32(C.selection_getpoint(C.cell(xAddress,"short").value,C.i16(C.i32((C.i32(C.cell(yAddress,"short").value)+2))),ov))))&&(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(C.cell(yAddress,"short").value)+2)))*C.sizes["struct rm"]),"rm","typ").value))>=C.DOOR))))) {
                (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(C.cell(yAddress,"short").value)+1)))*C.sizes["struct rm"]),"rm","typ").value=C.i8(C.SDOOR));
                break gotitdone;
            }
            if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(C.isok(C.cell(xAddress,"short").value,C.i16(C.i32((C.i32(C.cell(yAddress,"short").value)-1))))&&Number(!(C.selection_getpoint(C.cell(xAddress,"short").value,C.i16(C.i32((C.i32(C.cell(yAddress,"short").value)-1))),ov)))))&&(Number(!!(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(C.cell(yAddress,"short").value)-1)))*C.sizes["struct rm"]),"rm","typ").value))&&Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(C.cell(yAddress,"short").value)-1)))*C.sizes["struct rm"]),"rm","typ").value))<=C.DBWALL))))))&&C.isok(C.cell(xAddress,"short").value,C.i16(C.i32((C.i32(C.cell(yAddress,"short").value)-2))))))&&C.i32(C.selection_getpoint(C.cell(xAddress,"short").value,C.i16(C.i32((C.i32(C.cell(yAddress,"short").value)-2))),ov))))&&(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(C.cell(yAddress,"short").value)-2)))*C.sizes["struct rm"]),"rm","typ").value))>=C.DOOR))))) {
                (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(C.cell(yAddress,"short").value)-1)))*C.sizes["struct rm"]),"rm","typ").value=C.i8(C.SDOOR));
                break gotitdone;
            }
        }
        /* try to make a hole or a trapdoor */
        if(C.Can_fall_thru(C.field(C.u,"you","uz").address)) {
            C.selection_free(ov3,(C.i8(1)));
            (ov3=C.selection_clone(ov2));
            while(C.selection_rndcoord(ov3,xAddress,yAddress,(C.i8(1)))) {
                if(C.maketrap(C.cell(xAddress,"short").value,C.cell(yAddress,"short").value,(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),5198,(C.literal("generate_way_out_method"))),C.rn2(2))):C.rn2(2)))?C.HOLE:C.TRAPDOOR))) break gotitdone;
            }
        }
        /* generate one of the escape items */
        if(C.selection_rndcoord(ov2,xAddress,yAddress,(C.i8(0)))) {
            C.mksobj_at(C.cell((escapeitems+Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),5205,(C.literal("generate_way_out_method"))),C.rn2(C.i32((C.u64((BigInt((4*6))/BigInt(4)))))))):C.rn2(C.i32((C.u64((BigInt((4*6))/BigInt(4)))))))))*4),"int").value,C.cell(xAddress,"short").value,C.cell(yAddress,"short").value,(C.i8(1)),(C.i8(0)));
            break gotitdone;
        }
        (res=(C.i8(0)));
    }
    C.selection_free(ov2,(C.i8(1)));
    C.selection_free(ov3,(C.i8(1)));
    return res;
    } finally {C.stackRestore(stackFrame); }
}

export function ensure_way_out()
{
    let ov=C.selection_new();
    let ttmp=C.field(C.gf,"instance_globals_f","ftrap").value;
    let x; let y;
    let ret=(C.i8(1));
    let stway=C.field(C.gs,"instance_globals_s","stairs").value;
    C.set_selection_floodfillchk(C.functionPointer("floodfillchk_match_accessible"));
    while(stway) {
        if(Number(C.i32(C.field(C.field(stway,"stairway","tolev").address,"d_level","dnum").value)==C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value))) C.selection_floodfill(ov,C.field(stway,"stairway","sx").value,C.field(stway,"stairway","sy").value,(C.i8(1)));
        (stway=C.field(stway,"stairway","next").value);
    }
    while(ttmp) {
        if(Number(!!((Number(!!((Number(!!(Number(C.i32((C.field(ttmp,"trap","ttyp").value))==C.MAGIC_PORTAL)||Number(C.i32((C.field(ttmp,"trap","ttyp").value))==C.VIBRATING_SQUARE))))||(Number(!!(Number(C.i32((C.field(ttmp,"trap","ttyp").value))==C.HOLE)||Number(C.i32((C.field(ttmp,"trap","ttyp").value))==C.TRAPDOOR)))))))&&Number(!(C.selection_getpoint(C.field(ttmp,"trap","tx").value,C.field(ttmp,"trap","ty").value,ov)))))) C.selection_floodfill(ov,C.field(ttmp,"trap","tx").value,C.field(ttmp,"trap","ty").value,(C.i8(1)));
        (ttmp=C.field(ttmp,"trap","ntrap").value);
    }
    do {
        outhere: {
            (ret=(C.i8(1)));
            for((x=C.i16(1));Number(C.i32(x)<80);(()=>{const old=x;const next=C.i16((old+1));x=next;return old;})()) for((y=C.i16(0));Number(C.i32(y)<21);(()=>{const old=y;const next=C.i16((old+1));y=next;return old;})()) if(Number(!!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))>=C.DOOR))&&Number(!(C.selection_getpoint(x,y,ov)))))) {
                if(generate_way_out_method(x,y,ov)) C.selection_floodfill(ov,x,y,(C.i8(1)));
                (ret=(C.i8(0)));
                break outhere;
            }


        }
        ;
    } while(Number(!(ret)));
    C.selection_free(ov,(C.i8(1)));
}

export function get_table_intarray_entry(L,tableidx,entrynum)
{
    tableidx=C.i32(tableidx);
    entrynum=C.i32(entrynum);
    const stackFrame=C.stackSave();
    try {
    let ret=C.i64(0);
    if(Number(tableidx<0)) (()=>{const old=tableidx;const next=C.i32((old-1));tableidx=next;return old;})();
    C.lua_pushinteger(L,C.i64(entrynum));
    C.lua_gettable(L,tableidx);
    if(C.lua_isnumber(L,C.i32((-1)))) {
        (ret=C.lua_tointegerx(L,(C.i32((-1))),0));
    } else {
        let buf=C.stackAlloc((1*256));
        C.variadic(29,buf,C.literal("Array entry #%i is %s, expected number"),1,C.lua_typename(L,C.lua_type(L,(C.i32((-1))))));
        C.nhl_error(L,buf);
    }
    C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
    return ret;
    } finally {C.stackRestore(stackFrame); }
}

export function get_table_region(L,name,x1,y1,x2,y2,optional)
{
    optional=C.i8(optional);
    let arrlen;
    C.lua_getfield(L,1,name);
    if(Number(!!(C.i32(optional)&&Number(C.lua_type(L,C.i32((-1)))==0)))) {
        C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
        return 1;
    }
    C.luaL_checktype(L,C.i32((-1)),5);
    C.lua_len(L,C.i32((-1)));
    (arrlen=C.lua_tointegerx(L,(C.i32((-1))),0));
    C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
    if(Number(arrlen!=C.i64(4))) {
        C.nhl_error(L,C.literal("Not a region"));
        /*NOTREACHED*/
        C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
        return 0;
    }
    (C.cell(x1,"long long").value=get_table_intarray_entry(L,C.i32((-1)),1));
    (C.cell(y1,"long long").value=get_table_intarray_entry(L,C.i32((-1)),2));
    (C.cell(x2,"long long").value=get_table_intarray_entry(L,C.i32((-1)),3));
    (C.cell(y2,"long long").value=get_table_intarray_entry(L,C.i32((-1)),4));
    C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
    return 1;
}

export function get_coord(L,i,x,y)
{
    i=C.i32(i);
    let ret=(C.i8(0));
    let ltyp=C.lua_type(L,i);
    if(Number(ltyp==5)) {
        let arrlen;
        let gotx=(C.i8(0));
        C.lua_getfield(L,i,C.literal("x"));
        if(Number(!((Number(C.lua_type(L,(C.i32((-1))))==0))))) {
            (C.cell(x,"long long").value=C.luaL_checkinteger(L,C.i32((-1))));
            (gotx=(C.i8(1)));
        }
        C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
        if(gotx) {
            C.lua_getfield(L,i,C.literal("y"));
            if(Number(!((Number(C.lua_type(L,(C.i32((-1))))==0))))) {
                (C.cell(y,"long long").value=C.luaL_checkinteger(L,C.i32((-1))));
                C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
                (ret=(C.i8(1)));
            } else {
                C.nhl_error(L,C.literal("Not a coordinate"));
                /*NOTREACHED*/
                return (C.i8(0));
            }
        } else {
            C.lua_len(L,i);
            (arrlen=C.i32(C.lua_tointegerx(L,(C.i32((-1))),0)));
            C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
            if(Number(arrlen!=2)) {
                C.nhl_error(L,C.literal("Not a coordinate"));
                /*NOTREACHED*/
                return (C.i8(0));
            }
            (C.cell(x,"long long").value=get_table_intarray_entry(L,i,1));
            (C.cell(y,"long long").value=get_table_intarray_entry(L,i,2));
            return (C.i8(1));
        }
    } else if(Number(ltyp!=0)) {
        /* non-existent coord is ok */
        C.nhl_error(L,C.literal("non-table coord specified"));
    }
    return ret;
}

export function levregion_add(lregion)
{
    if(Number(!(C.field(lregion,"lev_region","in_islev").value))) {
        get_location(C.field(C.field(lregion,"lev_region","inarea").address,"sp_lev_lregion_inarea","x1").address,C.field(C.field(lregion,"lev_region","inarea").address,"sp_lev_lregion_inarea","y1").address,C.u32(16),0);
        get_location(C.field(C.field(lregion,"lev_region","inarea").address,"sp_lev_lregion_inarea","x2").address,C.field(C.field(lregion,"lev_region","inarea").address,"sp_lev_lregion_inarea","y2").address,C.u32(16),0);
    }
    if(Number(!(C.field(lregion,"lev_region","del_islev").value))) {
        get_location(C.field(C.field(lregion,"lev_region","delarea").address,"sp_lev_lregion_delarea","x1").address,C.field(C.field(lregion,"lev_region","delarea").address,"sp_lev_lregion_delarea","y1").address,C.u32(16),0);
        get_location(C.field(C.field(lregion,"lev_region","delarea").address,"sp_lev_lregion_delarea","x2").address,C.field(C.field(lregion,"lev_region","delarea").address,"sp_lev_lregion_delarea","y2").address,C.u32(16),0);
    }
    if(C.field(C.gn,"instance_globals_n","num_lregions").value) {
        /* realloc the lregion space to add the new one */
        let newl=C.alloc(C.u32(C.u64((BigInt(C.sizes["lev_region"])*C.u64(C.u32((C.i32((1+C.field(C.gn,"instance_globals_n","num_lregions").value)))))))));
        C.memcpy((newl),C.field(C.gl,"instance_globals_l","lregions").value,C.u64((BigInt(C.sizes["lev_region"])*C.u64(C.field(C.gn,"instance_globals_n","num_lregions").value))));
        do {
            if(C.field(C.gl,"instance_globals_l","lregions").value) C.free((C.field(C.gl,"instance_globals_l","lregions").value));
        } while(0);
        (()=>{const slot=C.field(C.gn,"instance_globals_n","num_lregions");const old=slot.value;const next=C.i32((old+1));slot.value=next;return old;})();
        (C.field(C.gl,"instance_globals_l","lregions").value=newl);
    } else {
        (C.field(C.gn,"instance_globals_n","num_lregions").value=1);
        (C.field(C.gl,"instance_globals_l","lregions").value=C.alloc(C.u32(BigInt(C.sizes["lev_region"]))));
    }
    C.memcpy((C.field(C.gl,"instance_globals_l","lregions").value+Number(C.i32((C.field(C.gn,"instance_globals_n","num_lregions").value-1)))*C.sizes["lev_region"]),lregion,BigInt(C.sizes["lev_region"]));
}

/* get params from topmost lua hash:
   - region = {x1,y1,x2,y2}
   - exclude = {x1,y1,x2,y2} (optional)
   - region_islev=true, exclude_islev=true (optional)
   - negative x and y are invalid */
export function l_get_lregion(L,tmplregion)
{
    const stackFrame=C.stackSave();
    try {
    let x1Address=C.stackAlloc(8); let y1Address=C.stackAlloc(8); let x2Address=C.stackAlloc(8); let y2Address=C.stackAlloc(8);
    get_table_region(L,C.literal("region"),x1Address,y1Address,x2Address,y2Address,(C.i8(0)));
    (C.field(C.field(tmplregion,"lev_region","inarea").address,"sp_lev_lregion_inarea","x1").value=C.i16(C.cell(x1Address,"long long").value));
    (C.field(C.field(tmplregion,"lev_region","inarea").address,"sp_lev_lregion_inarea","y1").value=C.i16(C.cell(y1Address,"long long").value));
    (C.field(C.field(tmplregion,"lev_region","inarea").address,"sp_lev_lregion_inarea","x2").value=C.i16(C.cell(x2Address,"long long").value));
    (C.field(C.field(tmplregion,"lev_region","inarea").address,"sp_lev_lregion_inarea","y2").value=C.i16(C.cell(y2Address,"long long").value));
    (C.cell(x1Address,"long long").value=(C.cell(y1Address,"long long").value=(C.cell(x2Address,"long long").value=(C.cell(y2Address,"long long").value=C.i64(C.i32((-1)))))));
    get_table_region(L,C.literal("exclude"),x1Address,y1Address,x2Address,y2Address,(C.i8(1)));
    (C.field(C.field(tmplregion,"lev_region","delarea").address,"sp_lev_lregion_delarea","x1").value=C.i16(C.cell(x1Address,"long long").value));
    (C.field(C.field(tmplregion,"lev_region","delarea").address,"sp_lev_lregion_delarea","y1").value=C.i16(C.cell(y1Address,"long long").value));
    (C.field(C.field(tmplregion,"lev_region","delarea").address,"sp_lev_lregion_delarea","x2").value=C.i16(C.cell(x2Address,"long long").value));
    (C.field(C.field(tmplregion,"lev_region","delarea").address,"sp_lev_lregion_delarea","y2").value=C.i16(C.cell(y2Address,"long long").value));
    (C.field(tmplregion,"lev_region","in_islev").value=C.i8(C.get_table_boolean_opt(L,C.literal("region_islev"),0)));
    (C.field(tmplregion,"lev_region","del_islev").value=C.i8(C.get_table_boolean_opt(L,C.literal("exclude_islev"),0)));
    /* if x1 is still negative, exclude wasn't specified, so we should treat
     * it as if there is no exclude region at all. Force exclude_islev to
     * true so the -1,-1,-1,-1 region is safely off the map and won't
     * interfere with branch or portal placement. */
    if(Number(C.cell(x1Address,"long long").value<C.i64(0))) (C.field(tmplregion,"lev_region","del_islev").value=(C.i8(1)));
    } finally {C.stackRestore(stackFrame); }
}

/* teleport_region({ region = { x1,y1, x2,y2 } }); */
/* teleport_region({ region = { x1,y1, x2,y2 }, [ region_islev = 1, ]
 *   exclude = { x1,y1, x2,y2 }, [ exclude_islen = 1, ] [ dir = "up" ] }); */
/* TODO: maybe allow using selection, with a new method "getextents()"? */
export function lspo_teleport_region(L)
{
    const stackFrame=C.stackSave();
    try {
    const teledirs=C.staticData("lspo_teleport_region","teledirs",()=>[C.literal("both"),C.literal("down"),C.literal("up"),0]);
    const teledirs2i=C.staticData("lspo_teleport_region","teledirs2i",()=>[C.LR_TELE,C.LR_DOWNTELE,C.LR_UPTELE,C.i32((-1))]);
    let tmplregion=C.stackAlloc(C.sizes["lev_region"]);
    create_des_coder();
    C.lcheck_param_table(L);
    l_get_lregion(L,tmplregion);
    (C.field(tmplregion,"lev_region","rtype").value=C.i16(C.cell((teledirs2i+Number(C.get_table_option(L,C.literal("dir"),C.literal("both"),teledirs))*4),"int").value));
    (C.field(tmplregion,"lev_region","padding").value=C.i16(0));
    (C.field(C.field(tmplregion,"lev_region","rname").address,"str_or_len","str").value=0);
    levregion_add(tmplregion);
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

/* TODO: FIXME
   from lev_comp SPO_LEVREGION was called as:
   - STAIR:(x1,y1,x2,y2),(x1,y1,x2,y2),dir
   - PORTAL:(x1,y1,x2,y2),(x1,y1,x2,y2),string
   - BRANCH:(x1,y1,x2,y2),(x1,y1,x2,y2),dir
*/
/* levregion({ region = { x1,y1, x2,y2 }, exclude = { x1,y1, x2,y2 },
 *             type = "portal", name="air" }); */
/* TODO: allow region to be optional, defaulting to whole level */
export function lspo_levregion(L)
{
    const stackFrame=C.stackSave();
    try {
    const regiontypes=C.staticData("lspo_levregion","regiontypes",()=>[C.literal("stair-down"),C.literal("stair-up"),C.literal("portal"),C.literal("branch"),C.literal("teleport"),C.literal("teleport-up"),C.literal("teleport-down"),0]);
    const regiontypes2i=C.staticData("lspo_levregion","regiontypes2i",()=>[C.LR_DOWNSTAIR,C.LR_UPSTAIR,C.LR_PORTAL,C.LR_BRANCH,C.LR_TELE,C.LR_UPTELE,C.LR_DOWNTELE,0]);
    let tmplregion=C.stackAlloc(C.sizes["lev_region"]);
    create_des_coder();
    C.lcheck_param_table(L);
    l_get_lregion(L,tmplregion);
    (C.field(tmplregion,"lev_region","rtype").value=C.i16(C.cell((regiontypes2i+Number(C.get_table_option(L,C.literal("type"),C.literal("stair-down"),regiontypes))*4),"int").value));
    (C.field(tmplregion,"lev_region","padding").value=C.i16(C.get_table_int_opt(L,C.literal("padding"),0)));
    (C.field(C.field(tmplregion,"lev_region","rname").address,"str_or_len","str").value=C.get_table_str_opt(L,C.literal("name"),0));
    levregion_add(tmplregion);
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

/* exclusion({ type = "teleport", region = { x1,y1, x2,y2 } }); */
export function lspo_exclusion(L)
{
    const stackFrame=C.stackSave();
    try {
    const ez_types=C.staticData("lspo_exclusion","ez_types",()=>[C.literal("teleport"),C.literal("teleport-up"),C.literal("teleport-down"),C.literal("monster-generation"),0]);
    const ez_types2i=C.staticData("lspo_exclusion","ez_types2i",()=>[C.LR_TELE,C.LR_UPTELE,C.LR_DOWNTELE,C.LR_MONGEN,0]);
    let ez=C.alloc(C.u32(BigInt(C.sizes["struct exclusion_zone"])));
    let x1Address=C.stackAlloc(8); let y1Address=C.stackAlloc(8); let x2Address=C.stackAlloc(8); let y2Address=C.stackAlloc(8);
    let a1Address=C.stackAlloc(2); let b1Address=C.stackAlloc(2); let a2Address=C.stackAlloc(2); let b2Address=C.stackAlloc(2);
    create_des_coder();
    C.lcheck_param_table(L);
    (C.field(ez,"exclusion_zone","zonetype").value=C.i16(C.cell((ez_types2i+Number(C.get_table_option(L,C.literal("type"),C.literal("teleport"),ez_types))*4),"int").value));
    get_table_region(L,C.literal("region"),x1Address,y1Address,x2Address,y2Address,(C.i8(0)));
    ((C.cell(a1Address,"short").value=C.i16(C.cell(x1Address,"long long").value)),(C.cell(b1Address,"short").value=C.i16(C.cell(y1Address,"long long").value)));
    ((C.cell(a2Address,"short").value=C.i16(C.cell(x2Address,"long long").value)),(C.cell(b2Address,"short").value=C.i16(C.cell(y2Address,"long long").value)));
    get_location_coord(a1Address,b1Address,C.i32((16|32)),C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value,C.i64((C.i32(((C.i32((C.i32((C.cell(a1Address,"short").value))&255)))+(C.i32(((C.i32((C.i32((C.cell(b1Address,"short").value))&255)))<<16))))))));
    get_location_coord(a2Address,b2Address,C.i32((16|32)),C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value,C.i64((C.i32(((C.i32((C.i32((C.cell(a2Address,"short").value))&255)))+(C.i32(((C.i32((C.i32((C.cell(b2Address,"short").value))&255)))<<16))))))));
    (C.field(ez,"exclusion_zone","lx").value=C.cell(a1Address,"short").value);
    (C.field(ez,"exclusion_zone","ly").value=C.cell(b1Address,"short").value);
    (C.field(ez,"exclusion_zone","hx").value=C.cell(a2Address,"short").value);
    (C.field(ez,"exclusion_zone","hy").value=C.cell(b2Address,"short").value);
    (C.field(ez,"exclusion_zone","next").value=C.field(C.sve,"instance_globals_saved_e","exclusion_zones").value);
    (C.field(C.sve,"instance_globals_saved_e","exclusion_zones").value=ez);
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

export function sel_set_lit(x,y,arg)
{
    x=C.i16(x);
    y=C.i16(y);
    let lit=C.cell(arg,"int").value;
    (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","lit").value=C.u32(((Number(!!((Number(!!(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))==C.LAVAPOOL)||Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))==C.LAVAWALL))))||lit)))?1:0)));
}

/* Add to the room any doors within/bordering it */
export function add_doors_to_room(croom)
{
    let x; let y;
    let i;
    for((x=C.i16(C.i32((C.i32(C.field(croom,"mkroom","lx").value)-1))));Number(C.i32(x)<=C.i32((C.i32(C.field(croom,"mkroom","hx").value)+1)));(()=>{const old=x;const next=C.i16((old+1));x=next;return old;})()) for((y=C.i16(C.i32((C.i32(C.field(croom,"mkroom","ly").value)-1))));Number(C.i32(y)<=C.i32((C.i32(C.field(croom,"mkroom","hy").value)+1)));(()=>{const old=y;const next=C.i16((old+1));y=next;return old;})()) if(Number(!!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))==C.DOOR))||Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.SDOOR)))) maybe_add_door(C.i32(x),C.i32(y),croom);


    for((i=0);Number(i<C.i32(C.field(croom,"mkroom","nsubrooms").value));(()=>{const old=i;const next=C.i32((old+1));i=next;return old;})()) add_doors_to_room(C.cell((C.field(croom,"mkroom","sbrooms").address+Number(i)*8),"struct mkroom *").value);

}

/* inside a lua table, get fields x1,y1,x2,y2 or region table */
export function get_table_coords_or_region(L,dx1,dy1,dx2,dy2)
{
    const stackFrame=C.stackSave();
    try {
    (C.cell(dx1,"short").value=C.i16(C.get_table_int_opt(L,C.literal("x1"),C.i32((-1)))));
    (C.cell(dy1,"short").value=C.i16(C.get_table_int_opt(L,C.literal("y1"),C.i32((-1)))));
    (C.cell(dx2,"short").value=C.i16(C.get_table_int_opt(L,C.literal("x2"),C.i32((-1)))));
    (C.cell(dy2,"short").value=C.i16(C.get_table_int_opt(L,C.literal("y2"),C.i32((-1)))));
    if(Number(!!(Number(!!(Number(!!(Number(C.i32(C.cell(dx1,"short").value)==C.i32((-1)))&&Number(C.i32(C.cell(dy1,"short").value)==C.i32((-1)))))&&Number(C.i32(C.cell(dx2,"short").value)==C.i32((-1)))))&&Number(C.i32(C.cell(dy2,"short").value)==C.i32((-1)))))) {
        let rx1Address=C.stackAlloc(8); let ry1Address=C.stackAlloc(8); let rx2Address=C.stackAlloc(8); let ry2Address=C.stackAlloc(8);
        get_table_region(L,C.literal("region"),rx1Address,ry1Address,rx2Address,ry2Address,(C.i8(0)));
        (C.cell(dx1,"short").value=C.i16(C.cell(rx1Address,"long long").value));
        (C.cell(dy1,"short").value=C.i16(C.cell(ry1Address,"long long").value));
        (C.cell(dx2,"short").value=C.i16(C.cell(rx2Address,"long long").value));
        (C.cell(dy2,"short").value=C.i16(C.cell(ry2Address,"long long").value));
    }
    } finally {C.stackRestore(stackFrame); }
}

/* region(selection, lit); */
/* region({ x1=NN, y1=NN, x2=NN, y2=NN, lit=BOOL, type=ROOMTYPE, joined=BOOL,
 *          irregular=BOOL, filled=NN [ , contents = FUNCTION ] }); */
/* region({ region={x1,y1, x2,y2}, type="ordinary" }); */
export function lspo_region(L)
{
    const stackFrame=C.stackSave();
    try {
    let dx1Address=C.stackAlloc(2); let dy1Address=C.stackAlloc(2); let dx2Address=C.stackAlloc(2); let dy2Address=C.stackAlloc(2);
    let troom;
    let do_arrival_room=(C.i8(0)); let room_not_needed; let irregular=(C.i8(0)); let joined=(C.i8(1));
    let rtype=C.OROOM; let rlitAddress=C.stackAlloc(4); C.cell(rlitAddress,"int").value=1; let needfill=0;
    let argc=C.lua_gettop(L);
    create_des_coder();
    if(Number(argc<=1)) {
        C.lcheck_param_table(L);
        /* TODO: "unfilled" => filled=0, "filled" => filled=1, and
         * "lvflags_only" => filled=2, probably in a get_table_needfill_opt */
        (needfill=C.get_table_int_opt(L,C.literal("filled"),0));
        (irregular=C.i8(C.get_table_boolean_opt(L,C.literal("irregular"),0)));
        (joined=C.i8(C.get_table_boolean_opt(L,C.literal("joined"),C.i32((C.i8(1))))));
        (do_arrival_room=C.i8(C.get_table_boolean_opt(L,C.literal("arrival_room"),0)));
        (rtype=get_table_roomtype_opt(L,C.literal("type"),C.OROOM));
        (C.cell(rlitAddress,"int").value=C.get_table_int_opt(L,C.literal("lit"),C.i32((-1))));
        get_table_coords_or_region(L,dx1Address,dy1Address,dx2Address,dy2Address);
        if(Number(!!(Number(!!(Number(!!(Number(C.i32(C.cell(dx1Address,"short").value)==C.i32((-1)))&&Number(C.i32(C.cell(dy1Address,"short").value)==C.i32((-1)))))&&Number(C.i32(C.cell(dx2Address,"short").value)==C.i32((-1)))))&&Number(C.i32(C.cell(dy2Address,"short").value)==C.i32((-1)))))) {
            C.nhl_error(L,C.literal("region needs region"));
        }
    } else if(Number(argc==2)) {
        /* region(selection, "lit"); */
        const lits=C.staticData("lspo_region","lits",()=>[C.literal("unlit"),C.literal("lit"),0]);
        let orig=C.l_selection_check(L,1); let sel=C.selection_clone(orig);
        (C.cell(rlitAddress,"int").value=C.luaL_checkoption(L,2,C.literal("lit"),lits));
        /*
    TODO: lit=random
        */
        if(C.cell(rlitAddress,"int").value) C.selection_do_grow(sel,(C.i32((C.i32((C.i32((1|2))|4))|8))));
        C.selection_iterate(sel,C.functionPointer("sel_set_lit"),rlitAddress);
        C.selection_free(sel,(C.i8(1)));
        /* TODO: skip the rest of this function? */
        return 0;
    } else {
        C.nhl_error(L,C.literal("Wrong parameters"));
        /*NOTREACHED*/
        return 0;
    }
    (C.cell(rlitAddress,"int").value=C.i32(C.litstate_rnd(C.cell(rlitAddress,"int").value)));
    get_location(dx1Address,dy1Address,C.u32(16),0);
    get_location(dx2Address,dy2Address,C.u32(16),0);
    /* Many regions are simple, rectangular areas that just need to set
     * lighting in an area. In that case, we don't need to do anything
     * complicated by creating a room. The exceptions are:
     *  - Special rooms (which usually need to be filled).
     *  - Irregular regions (more convenient to use the room-making code).
     *  - Themed room regions (which often have contents).
     *  - When a room is desired to constrain the arrival of migrating
     *    monsters (see the mon_arrive function for details).
     */
    (room_not_needed=C.i8((Number(!!(Number(!!(Number(!!(Number(rtype==C.OROOM)&&Number(!(irregular))))&&Number(!(do_arrival_room))))&&Number(!(C.field(C.gi,"instance_globals_i","in_mk_themerooms").value)))))));
    if(Number(!!(C.i32(room_not_needed)||Number(C.field(C.svn,"instance_globals_saved_n","nroom").value>=40)))) {
        let tmpregion=C.stackAlloc(C.sizes["region"]);
        if(Number(!(room_not_needed))) C.variadic(30,C.literal("Too many rooms on new level!"));
        (C.field(tmpregion,"region","rlit").value=C.i16(C.cell(rlitAddress,"int").value));
        (C.field(tmpregion,"region","x1").value=C.cell(dx1Address,"short").value);
        (C.field(tmpregion,"region","y1").value=C.cell(dy1Address,"short").value);
        (C.field(tmpregion,"region","x2").value=C.cell(dx2Address,"short").value);
        (C.field(tmpregion,"region","y2").value=C.cell(dy2Address,"short").value);
        light_region(tmpregion);
        return 0;
    }
    (troom=(C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(C.field(C.svn,"instance_globals_saved_n","nroom").value)*C.sizes["struct mkroom"]));
    /* mark rooms that must be filled, but do it later */
    (C.field(troom,"mkroom","needfill").value=C.i8(needfill));
    (C.field(troom,"mkroom","needjoining").value=joined);
    if(irregular) {
        (C.field(C.gm,"instance_globals_m","min_rx").value=(C.field(C.gm,"instance_globals_m","max_rx").value=C.cell(dx1Address,"short").value));
        (C.field(C.gm,"instance_globals_m","min_ry").value=(C.field(C.gm,"instance_globals_m","max_ry").value=C.cell(dy1Address,"short").value));
        (C.cell((C.field(C.gs,"instance_globals_s","smeq").address+Number(C.field(C.svn,"instance_globals_saved_n","nroom").value)*4),"int").value=C.field(C.svn,"instance_globals_saved_n","nroom").value);
        C.flood_fill_rm(C.cell(dx1Address,"short").value,C.cell(dy1Address,"short").value,C.i32((C.field(C.svn,"instance_globals_saved_n","nroom").value+3)),C.i8(C.cell(rlitAddress,"int").value),(C.i8(1)));
        C.add_room(C.field(C.gm,"instance_globals_m","min_rx").value,C.field(C.gm,"instance_globals_m","min_ry").value,C.field(C.gm,"instance_globals_m","max_rx").value,C.field(C.gm,"instance_globals_m","max_ry").value,(C.i8(0)),C.i8(rtype),(C.i8(1)));
        (C.field(troom,"mkroom","rlit").value=C.i8(C.cell(rlitAddress,"int").value));
        (C.field(troom,"mkroom","irregular").value=(C.i8(1)));
    } else {
        C.add_room(C.cell(dx1Address,"short").value,C.cell(dy1Address,"short").value,C.cell(dx2Address,"short").value,C.cell(dy2Address,"short").value,C.i8(C.cell(rlitAddress,"int").value),C.i8(rtype),(C.i8(1)));
        /* set roomno */
        C.topologize(troom);
        /* set roomno */
    }
    if(Number(!(room_not_needed))) {
        if(Number(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","n_subroom").value>1)) {
            C.variadic(31,C.literal("region as subroom"));
        } else {
            (C.cell((C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","tmproomlist").address+Number(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","n_subroom").value)*8),"struct mkroom *").value=troom);
            (C.cell((C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","failed_room").address+Number(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","n_subroom").value)*1),"signed char").value=(C.i8(0)));
            (()=>{const slot=C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","n_subroom");const old=slot.value;const next=C.i32((old+1));slot.value=next;return old;})();
            update_croom();
            C.lua_getfield(L,1,C.literal("contents"));
            if(Number(C.lua_type(L,C.i32((-1)))==6)) {
                ((C.lua_rotate(L,(C.i32((-2))),C.i32((-1))),C.lua_settop(L,C.i32((C.i32((-(1)))-1)))));
                l_push_mkroom_table(L,troom);
                C.nhl_pcall_handle(L,1,0,C.literal("lspo_region"),C.i32(C.NHLpa_panic));
            } else {
                C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
            }
            spo_endroom(C.field(C.gc,"instance_globals_c","coder").value);
            add_doors_to_room(troom);
        }
    }
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

/* drawbridge({ dir="east", state="closed", x=05,y=08 }); */
/* drawbridge({ dir="east", state="closed", coord={05,08} }); */
export function lspo_drawbridge(L)
{
    const stackFrame=C.stackSave();
    try {
    const mwdirs=C.staticData("lspo_drawbridge","mwdirs",()=>[C.literal("north"),C.literal("south"),C.literal("west"),C.literal("east"),C.literal("random"),0]);
    const mwdirs2i=C.staticData("lspo_drawbridge","mwdirs2i",()=>[0,1,3,2,C.i32((-1)),C.i32((-2))]);
    const dbopens=C.staticData("lspo_drawbridge","dbopens",()=>[C.literal("open"),C.literal("closed"),C.literal("random"),0]);
    const dbopens2i=C.staticData("lspo_drawbridge","dbopens2i",()=>[1,0,C.i32((-1)),C.i32((-2))]);
    let xAddress=C.stackAlloc(2); let yAddress=C.stackAlloc(2);
    let mxAddress=C.stackAlloc(8); let myAddress=C.stackAlloc(8);
    let dir;
    let db_open;
    let dcoord;
    create_des_coder();
    C.lcheck_param_table(L);
    get_table_xy_or_coord(L,mxAddress,myAddress);
    (dir=C.cell((mwdirs2i+Number(C.get_table_option(L,C.literal("dir"),C.literal("random"),mwdirs))*4),"int").value);
    (dcoord=C.i64((C.i64(((C.i64(((C.cell(mxAddress,"long long").value)&C.i64(255))))+(C.i64(((C.i64(((C.cell(myAddress,"long long").value)&C.i64(255))))<<BigInt(16)))))))));
    (db_open=C.cell((dbopens2i+Number(C.get_table_option(L,C.literal("state"),C.literal("random"),dbopens))*4),"int").value);
    (C.cell(xAddress,"short").value=C.i16(C.cell(mxAddress,"long long").value));
    (C.cell(yAddress,"short").value=C.i16(C.cell(myAddress,"long long").value));
    get_location_coord(xAddress,yAddress,C.i32((C.i32((1|2))|4)),C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value,dcoord);
    if(Number(!(C.isok(C.i16(C.cell(mxAddress,"long long").value),C.i16(C.cell(myAddress,"long long").value))))) {
        C.nhl_error(L,C.literal("drawbridge coord not ok"));
        /*NOTREACHED*/
        return 0;
    }
    if(Number(db_open==C.i32((-1)))) (db_open=Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),5757,(C.literal("lspo_drawbridge"))),C.rn2(2))):C.rn2(2))))));
    if(Number(!(C.create_drawbridge(C.cell(xAddress,"short").value,C.cell(yAddress,"short").value,dir,C.i8((db_open?C.i32((C.i8(1))):C.i32((C.i8(0))))))))) C.variadic(32,C.literal("Cannot create drawbridge."));
    (C.cell(((C.SpLev_Map+Number(C.cell(xAddress,"short").value)*(1*21))+Number(C.cell(yAddress,"short").value)*1),"char").value=C.i8(1));
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

/* mazewalk({ x = NN, y = NN, typ = ".", dir = "north", stocked = 0 }); */
/* mazewalk({ coord = {XX, YY}, typ = ".", dir = "north", stocked = 0 }); */
/* mazewalk(x,y,dir); */
export function lspo_mazewalk(L)
{
    const stackFrame=C.stackSave();
    try {
    const mwdirs=C.staticData("lspo_mazewalk","mwdirs",()=>[C.literal("north"),C.literal("south"),C.literal("east"),C.literal("west"),C.literal("random"),0]);
    const mwdirs2i=C.staticData("lspo_mazewalk","mwdirs2i",()=>[1,2,4,8,C.i32((-1)),C.i32((-2))]);
    let xAddress=C.stackAlloc(2); let yAddress=C.stackAlloc(2);
    let mxAddress=C.stackAlloc(8); let myAddress=C.stackAlloc(8);
    let ftyp=C.i16(C.ROOM);
    let fstocked=1; let dir=C.i32((-1));
    let mcoord;
    let argc=C.lua_gettop(L);
    create_des_coder();
    if(Number(argc==3)) {
        (C.cell(mxAddress,"long long").value=C.luaL_checkinteger(L,1));
        (C.cell(myAddress,"long long").value=C.luaL_checkinteger(L,2));
        (dir=C.cell((mwdirs2i+Number(C.luaL_checkoption(L,3,C.literal("random"),mwdirs))*4),"int").value);
    } else {
        C.lcheck_param_table(L);
        get_table_xy_or_coord(L,mxAddress,myAddress);
        (ftyp=C.i16(C.get_table_mapchr_opt(L,C.literal("typ"),C.i8(C.ROOM))));
        (fstocked=C.get_table_boolean_opt(L,C.literal("stocked"),1));
        (dir=C.cell((mwdirs2i+Number(C.get_table_option(L,C.literal("dir"),C.literal("random"),mwdirs))*4),"int").value);
    }
    (mcoord=C.i64((C.i64(((C.i64(((C.cell(mxAddress,"long long").value)&C.i64(255))))+(C.i64(((C.i64(((C.cell(myAddress,"long long").value)&C.i64(255))))<<BigInt(16)))))))));
    (C.cell(xAddress,"short").value=C.i16(C.cell(mxAddress,"long long").value));
    (C.cell(yAddress,"short").value=C.i16(C.cell(myAddress,"long long").value));
    get_location_coord(xAddress,yAddress,16,C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value,mcoord);
    if(Number(!(C.isok(C.cell(xAddress,"short").value,C.cell(yAddress,"short").value)))) {
        C.nhl_error(L,C.literal("mazewalk coord not ok"));
        /*NOTREACHED*/
        return 0;
    }
    if(Number(C.i32(ftyp)<1)) {
        (ftyp=C.i16((C.i32(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","corrmaze").value)?C.CORR:C.ROOM)));
    }
    if(Number(dir==C.i32((-1)))) (dir=C.i32(random_wdir()));
    /* don't use move() - it doesn't use W_NORTH, etc. */
    switch(dir) {
        case (1):
            (()=>{const slot=C.cell(yAddress,"short");const old=slot.value;const next=C.i16((old-1));slot.value=next;return next;})();
        break;
        case (2):
            (()=>{const slot=C.cell(yAddress,"short");const old=slot.value;const next=C.i16((old+1));slot.value=next;return old;})();
        break;
        case (4):
            (()=>{const slot=C.cell(xAddress,"short");const old=slot.value;const next=C.i16((old+1));slot.value=next;return old;})();
        break;
        case (8):
            (()=>{const slot=C.cell(xAddress,"short");const old=slot.value;const next=C.i16((old-1));slot.value=next;return next;})();
        break;
        default:
            C.variadic(33,C.literal("mazewalk: Bad direction"));
    }
    if(Number(!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"short").value)*C.sizes["struct rm"]),"rm","typ").value))==C.DOOR))))) {
        (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"short").value)*C.sizes["struct rm"]),"rm","typ").value=C.i8(ftyp));
        (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"short").value)*C.sizes["struct rm"]),"rm","flags").value=C.u32(0));
    }
    /*
     * We must be sure that the parity of the coordinates for
     * walkfrom() is odd.  But we must also take into account
     * what direction was chosen.
     */
    if(Number(!((C.i32((C.i32(C.cell(xAddress,"short").value)%2)))))) {
        if(Number(dir==4)) (()=>{const slot=C.cell(xAddress,"short");const old=slot.value;const next=C.i16((old+1));slot.value=next;return old;})();
 else (()=>{const slot=C.cell(xAddress,"short");const old=slot.value;const next=C.i16((old-1));slot.value=next;return old;})();
        /* no need for IS_DOOR check; out of map bounds */
        (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"short").value)*C.sizes["struct rm"]),"rm","typ").value=C.i8(ftyp));
        (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"short").value)*C.sizes["struct rm"]),"rm","flags").value=C.u32(0));
    }
    if(Number(!((C.i32((C.i32(C.cell(yAddress,"short").value)%2)))))) {
        if(Number(dir==2)) (()=>{const slot=C.cell(yAddress,"short");const old=slot.value;const next=C.i16((old+1));slot.value=next;return old;})();
 else (()=>{const slot=C.cell(yAddress,"short");const old=slot.value;const next=C.i16((old-1));slot.value=next;return old;})();
    }
    C.walkfrom(C.cell(xAddress,"short").value,C.cell(yAddress,"short").value,C.i8(ftyp));
    if(fstocked) fill_empty_maze();
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

/* wall_property({ x1=0, y1=0, x2=78, y2=20, property="nondiggable" }); */
/* wall_property({ region = {1,0, 78,20}, property="nonpasswall" }); */
export function lspo_wall_property(L)
{
    const stackFrame=C.stackSave();
    try {
    const wprops=C.staticData("lspo_wall_property","wprops",()=>[C.literal("nondiggable"),C.literal("nonpasswall"),0]);
    const wprop2i=C.staticData("lspo_wall_property","wprop2i",()=>[8,16,C.i32((-1))]);
    let dx1Address=C.stackAlloc(2); C.cell(dx1Address,"short").value=C.i16(C.i32((-1))); let dy1Address=C.stackAlloc(2); C.cell(dy1Address,"short").value=C.i16(C.i32((-1))); let dx2Address=C.stackAlloc(2); C.cell(dx2Address,"short").value=C.i16(C.i32((-1))); let dy2Address=C.stackAlloc(2); C.cell(dy2Address,"short").value=C.i16(C.i32((-1)));
    let wprop;
    create_des_coder();
    C.lcheck_param_table(L);
    get_table_coords_or_region(L,dx1Address,dy1Address,dx2Address,dy2Address);
    (wprop=C.cell((wprop2i+Number(C.get_table_option(L,C.literal("property"),C.literal("nondiggable"),wprops))*4),"int").value);
    if(Number(C.i32(C.cell(dx1Address,"short").value)==C.i32((-1)))) (C.cell(dx1Address,"short").value=C.i16(C.i32((C.i32(C.field(C.gx,"instance_globals_x","xstart").value)-1))));
    if(Number(C.i32(C.cell(dy1Address,"short").value)==C.i32((-1)))) (C.cell(dy1Address,"short").value=C.i16(C.i32((C.i32(C.field(C.gy,"instance_globals_y","ystart").value)-1))));
    if(Number(C.i32(C.cell(dx2Address,"short").value)==C.i32((-1)))) (C.cell(dx2Address,"short").value=C.i16(C.i32((C.i32((C.i32(C.field(C.gx,"instance_globals_x","xstart").value)+C.i32(C.field(C.gx,"instance_globals_x","xsize").value)))+1))));
    if(Number(C.i32(C.cell(dy2Address,"short").value)==C.i32((-1)))) (C.cell(dy2Address,"short").value=C.i16(C.i32((C.i32((C.i32(C.field(C.gy,"instance_globals_y","ystart").value)+C.i32(C.field(C.gy,"instance_globals_y","ysize").value)))+1))));
    get_location(dx1Address,dy1Address,C.u32(16),0);
    get_location(dx2Address,dy2Address,C.u32(16),0);
    set_wall_property(C.cell(dx1Address,"short").value,C.cell(dy1Address,"short").value,C.cell(dx2Address,"short").value,C.cell(dy2Address,"short").value,wprop);
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

export function set_wallprop_in_selection(L,prop)
{
    prop=C.i32(prop);
    const stackFrame=C.stackSave();
    try {
    const propAddress=C.stackAlloc(4);C.cell(propAddress,"int").value=prop;
    let argc=C.lua_gettop(L);
    let freesel=(C.i8(0));
    let sel=0;
    create_des_coder();
    if(Number(argc==1)) {
        (sel=C.l_selection_check(L,C.i32((-1))));
    } else if(Number(argc==0)) {
        (freesel=(C.i8(1)));
        (sel=C.selection_new());
        C.selection_clear(sel,1);
    }
    if(sel) {
        C.selection_iterate(sel,C.functionPointer("sel_set_wall_property"),propAddress);
        if(freesel) C.selection_free(sel,(C.i8(1)));
    }
    } finally {C.stackRestore(stackFrame); }
}

/* non_diggable(selection); */
/* non_diggable(); */
export function lspo_non_diggable(L)
{
    set_wallprop_in_selection(L,8);
    return 0;
}

/* non_passwall(selection); */
/* non_passwall(); */
export function lspo_non_passwall(L)
{
    set_wallprop_in_selection(L,16);
    return 0;
}

/*ARGSUSED*/
/* TODO: wallify(selection) */
/* wallify({ x1=NN,y1=NN, x2=NN,y2=NN }); */
/* wallify(); */
export function lspo_wallify(L)
{
    let dx1=C.i32((-1)); let dy1=C.i32((-1)); let dx2=C.i32((-1)); let dy2=C.i32((-1));
    /* TODO: clamp coord values */
    /* TODO: maybe allow wallify({x1,y1}, {x2,y2}) */
    /* TODO: is_table_coord(), is_table_area(),
             get_table_coord(), get_table_area() */
    create_des_coder();
    if(Number(C.lua_gettop(L)==1)) {
        (dx1=C.get_table_int(L,C.literal("x1")));
        (dy1=C.get_table_int(L,C.literal("y1")));
        (dx2=C.get_table_int(L,C.literal("x2")));
        (dy2=C.get_table_int(L,C.literal("y2")));
    }
    wallify_map(C.i16((Number(dx1<0)?(C.i32((C.i32(C.field(C.gx,"instance_globals_x","xstart").value)-1))):dx1)),C.i16((Number(dy1<0)?(C.i32((C.i32(C.field(C.gy,"instance_globals_y","ystart").value)-1))):dy1)),C.i16((Number(dx2<0)?(C.i32((C.i32((C.i32(C.field(C.gx,"instance_globals_x","xstart").value)+C.i32(C.field(C.gx,"instance_globals_x","xsize").value)))+1))):dx2)),C.i16((Number(dy2<0)?(C.i32((C.i32((C.i32(C.field(C.gy,"instance_globals_y","ystart").value)+C.i32(C.field(C.gy,"instance_globals_y","ysize").value)))+1))):dy2)));
    return 0;
}

/* reset_level is only needed for testing purposes */
export function lspo_reset_level(L)
{
    let wtower=C.In_W_tower(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,C.field(C.u,"you","uz").address);
    (C.field(C.iflags,"instance_flags","lua_testing").value=(C.i8(1)));
    if(L) {
        if(C.field(C.gc,"instance_globals_c","coder").value) {
            do {
                if(C.field(C.gc,"instance_globals_c","coder").value) C.free((C.field(C.gc,"instance_globals_c","coder").value));
            } while(0);
            (C.field(C.gc,"instance_globals_c","coder").value=0);
        }
        create_des_coder();
    }
    C.makemap_prepost((C.i8(1)),wtower);
    (C.field(C.gi,"instance_globals_i","in_mklev").value=(C.i8(1)));
    C.oinit();
    /* assign level dependent obj probabilities */
    C.clear_level_structures();
    return 0;
}

/* finalize_level is only needed for testing purposes */
export function lspo_finalize_level(L)
{
    let wtower=C.In_W_tower(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,C.field(C.u,"you","uz").address);
    let i;
    if(L) create_des_coder();
    link_doors_rooms();
    remove_boundary_syms();
    /* TODO: ensure_way_out() needs rewrite */
    if(Number(!!(L&&C.i32(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","check_inaccessibles").value)))) ensure_way_out();
    map_cleanup();
    /* FIXME: Ideally, we want this call to only cover areas of the map
     * which were not inserted directly by the special level file (see
     * the insect legs on Baalzebub's level, for instance). Since that
     * is currently not possible, we overload the corrmaze flag for this
     * purpose.
     */
    if(Number(!(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","corrmaze").value))) C.wallification(C.i16(1),C.i16(0),C.i16(C.i32((80-1))),C.i16(C.i32((21-1))));
    if(L) flip_level_rnd(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","allow_flips").value,(C.i8(0)));
    C.count_level_features();
    if(Number(!!(L&&C.i32(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","solidify").value)))) solidify_map();
    /* This must be done before premap_detect(),
     * otherwise branch stairs won't be premapped. */
    C.fixup_special();
    if(Number(!!(L&&C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","premapped").value))) C.premap_detect();
    C.level_finalize_topology();
    for((i=0);Number(i<C.field(C.svn,"instance_globals_saved_n","nroom").value);(()=>{const old=i;const next=C.i32((old+1));i=next;return next;})()) {
        fill_special_room((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(i)*C.sizes["struct mkroom"]));
    }
    C.makemap_prepost((C.i8(0)),wtower);
    (C.field(C.iflags,"instance_flags","lua_testing").value=(C.i8(0)));
    return 0;
}

/* map({ x = 10, y = 10, map = [[...]] }); */
/* map({ coord = {10, 10}, map = [[...]] }); */
/* map({ halign = "center", valign = "center", map = [[...]] }); */
/* map({ map = [[...]], contents = function(map) ... end }); */
/* map([[...]]) */
/* local selection = map( ... ); */
export function lspo_map(L)
{
    const stackFrame=C.stackSave();
    try {
    /*
TODO: allow passing an array of strings as map data
TODO: handle if map lines aren't same length
TODO: gc.coder->croom needs to be updated
     */
    const left_or_right=C.staticData("lspo_map","left_or_right",()=>[C.literal("left"),C.literal("half-left"),C.literal("center"),C.literal("half-right"),C.literal("right"),C.literal("none"),0]);
    const l_or_r2i=C.staticData("lspo_map","l_or_r2i",()=>[1,2,3,4,5,C.i32((-1)),C.i32((-1))]);
    const top_or_bot=C.staticData("lspo_map","top_or_bot",()=>[C.literal("top"),C.literal("center"),C.literal("bottom"),C.literal("none"),0]);
    const t_or_b2i=C.staticData("lspo_map","t_or_b2i",()=>[1,3,5,C.i32((-1)),C.i32((-1))]);
    let lr; let tb;
    let xAddress=C.stackAlloc(8); C.cell(xAddress,"long long").value=C.i64(C.i32((-1))); let yAddress=C.stackAlloc(8); C.cell(yAddress,"long long").value=C.i64(C.i32((-1)));
    let mfAddress=C.stackAlloc(8);
    let tmpstr;
    let argc=C.lua_gettop(L);
    let has_contents=(C.i8(0));
    let tryct=0;
    let ox; let oy;
    let lit=(C.i8(0));
    let sel;
    create_des_coder();
    if(Number(!!(C.i32(C.field(C.gi,"instance_globals_i","in_mk_themerooms").value)&&C.i32(C.field(C.gt,"instance_globals_t","themeroom_failed").value)))) return 0;
    if(Number(!!(Number(argc==1)&&Number(C.lua_type(L,1)==4)))) {
        (tmpstr=C.dupstr((C.luaL_checklstring(L,(1),0))));
        (lr=(tb=3));
        (C.cell(mfAddress,"struct mapfragment *").value=mapfrag_fromstr(tmpstr));
        C.free(tmpstr);
    } else {
        C.lcheck_param_table(L);
        (lr=C.cell((l_or_r2i+Number(C.get_table_option(L,C.literal("halign"),C.literal("none"),left_or_right))*4),"int").value);
        (tb=C.cell((t_or_b2i+Number(C.get_table_option(L,C.literal("valign"),C.literal("none"),top_or_bot))*4),"int").value);
        get_table_xy_or_coord(L,xAddress,yAddress);
        (tmpstr=C.get_table_str(L,C.literal("map")));
        (lit=C.i8(C.get_table_boolean_opt(L,C.literal("lit"),C.i32((C.i8(0))))));
        C.lua_getfield(L,1,C.literal("contents"));
        if(Number(C.lua_type(L,C.i32((-1)))==6)) {
            ((C.lua_rotate(L,(C.i32((-2))),C.i32((-1))),C.lua_settop(L,C.i32((C.i32((-(1)))-1)))));
            (has_contents=(C.i8(1)));
        } else {
            C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
        }
        (C.cell(mfAddress,"struct mapfragment *").value=mapfrag_fromstr(tmpstr));
        C.free(tmpstr);
    }
    if(Number(!(C.cell(mfAddress,"struct mapfragment *").value))) {
        C.nhl_error(L,C.literal("Map data error"));
        /*NOTREACHED*/
        return 0;
    }
    (sel=C.selection_new());
    (ox=C.i32(C.cell(xAddress,"long long").value));
    (oy=C.i32(C.cell(yAddress,"long long").value));
    skipmap: {
        redo_maploc: for(;;) {
            (C.field(C.gx,"instance_globals_x","xsize").value=C.i16(C.field(C.cell(mfAddress,"struct mapfragment *").value,"mapfragment","wid").value));
            (C.field(C.gy,"instance_globals_y","ysize").value=C.i16(C.field(C.cell(mfAddress,"struct mapfragment *").value,"mapfragment","hei").value));
            if(Number(!!(Number(lr==C.i32((-1)))&&Number(tb==C.i32((-1)))))) {
                if(Number(!!(C.i32(C.field(C.gi,"instance_globals_i","in_mk_themerooms").value)&&(Number(!!(Number(ox==C.i32((-1)))||Number(oy==C.i32((-1))))))))) {
                    if(Number(ox==C.i32((-1)))) {
                        if(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value) {
                            (C.cell(xAddress,"long long").value=C.i64(C.i32((C.somex(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value)-C.field(C.cell(mfAddress,"struct mapfragment *").value,"mapfragment","wid").value))));
                            if(Number(C.cell(xAddress,"long long").value<C.i64(1))) (C.cell(xAddress,"long long").value=C.i64(1));
                        } else {
                            (C.cell(xAddress,"long long").value=C.i64(C.i32((1+((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),6154,(C.literal("lspo_map"))),C.rn2(C.i32((C.i32((80-1))-C.field(C.cell(mfAddress,"struct mapfragment *").value,"mapfragment","wid").value))))):C.rn2(C.i32((C.i32((80-1))-C.field(C.cell(mfAddress,"struct mapfragment *").value,"mapfragment","wid").value)))))))));
                        }
                    }
                    if(Number(oy==C.i32((-1)))) {
                        if(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value) {
                            (C.cell(yAddress,"long long").value=C.i64(C.i32((C.somey(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value)-C.field(C.cell(mfAddress,"struct mapfragment *").value,"mapfragment","hei").value))));
                            if(Number(C.cell(yAddress,"long long").value<C.i64(1))) (C.cell(yAddress,"long long").value=C.i64(1));
                        } else {
                            (C.cell(yAddress,"long long").value=C.i64(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("sp_lev.c"),6164,(C.literal("lspo_map"))),C.rn2(C.i32((21-C.field(C.cell(mfAddress,"struct mapfragment *").value,"mapfragment","hei").value))))):C.rn2(C.i32((21-C.field(C.cell(mfAddress,"struct mapfragment *").value,"mapfragment","hei").value)))))));
                        }
                    }
                }
                if(C.isok(C.i16(C.cell(xAddress,"long long").value),C.i16(C.cell(yAddress,"long long").value))) {
                    /* x,y is given, place map starting at x,y */
                    if(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value) {
                        /* in a room? adjust to room relative coords */
                        (C.field(C.gx,"instance_globals_x","xstart").value=C.i16(C.i64((C.cell(xAddress,"long long").value+C.i64(C.field(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value,"mkroom","lx").value)))));
                        (C.field(C.gy,"instance_globals_y","ystart").value=C.i16(C.i64((C.cell(yAddress,"long long").value+C.i64(C.field(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value,"mkroom","ly").value)))));
                        (C.field(C.gx,"instance_globals_x","xsize").value=C.i16(((Number((C.field(C.cell(mfAddress,"struct mapfragment *").value,"mapfragment","wid").value)<((C.i32((C.i32(C.field(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value,"mkroom","hx").value)-C.i32(C.field(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value,"mkroom","lx").value))))))?(C.field(C.cell(mfAddress,"struct mapfragment *").value,"mapfragment","wid").value):((C.i32((C.i32(C.field(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value,"mkroom","hx").value)-C.i32(C.field(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value,"mkroom","lx").value)))))))));
                        (C.field(C.gy,"instance_globals_y","ysize").value=C.i16(((Number((C.field(C.cell(mfAddress,"struct mapfragment *").value,"mapfragment","hei").value)<((C.i32((C.i32(C.field(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value,"mkroom","hy").value)-C.i32(C.field(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value,"mkroom","ly").value))))))?(C.field(C.cell(mfAddress,"struct mapfragment *").value,"mapfragment","hei").value):((C.i32((C.i32(C.field(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value,"mkroom","hy").value)-C.i32(C.field(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value,"mkroom","ly").value)))))))));
                    } else {
                        (C.field(C.gx,"instance_globals_x","xsize").value=C.i16(C.field(C.cell(mfAddress,"struct mapfragment *").value,"mapfragment","wid").value));
                        (C.field(C.gy,"instance_globals_y","ysize").value=C.i16(C.field(C.cell(mfAddress,"struct mapfragment *").value,"mapfragment","hei").value));
                        (C.field(C.gx,"instance_globals_x","xstart").value=C.i16(C.cell(xAddress,"long long").value));
                        (C.field(C.gy,"instance_globals_y","ystart").value=C.i16(C.cell(yAddress,"long long").value));
                    }
                } else {
                    mapfrag_free(mfAddress);
                    C.nhl_error(L,C.literal("Map requires either x,y or halign,valign params"));
                    C.selection_free(sel,(C.i8(1)));
                    return 0;
                }
            } else {
                /* place map starting at halign,valign */
                switch(lr) {
                    case (1):
                        (C.field(C.gx,"instance_globals_x","xstart").value=C.i16((C.i32(C.cell(C.splev_init_present,"signed char").value)?1:3)));
                    break;
                    case (2):
                        (C.field(C.gx,"instance_globals_x","xstart").value=C.i16(C.i32((2+(C.i32(Math.trunc(((C.i32((C.i32((C.field(C.gx,"instance_globals_x","x_maze_max").value-2))-C.i32(C.field(C.gx,"instance_globals_x","xsize").value))))/4))))))));
                    break;
                    case (3):
                        (C.field(C.gx,"instance_globals_x","xstart").value=C.i16(C.i32((2+(C.i32(Math.trunc(((C.i32((C.i32((C.field(C.gx,"instance_globals_x","x_maze_max").value-2))-C.i32(C.field(C.gx,"instance_globals_x","xsize").value))))/2))))))));
                    break;
                    case (4):
                        (C.field(C.gx,"instance_globals_x","xstart").value=C.i16(C.i32((2+(C.i32(Math.trunc((C.i32(((C.i32((C.i32((C.field(C.gx,"instance_globals_x","x_maze_max").value-2))-C.i32(C.field(C.gx,"instance_globals_x","xsize").value))))*3))/4))))))));
                    break;
                    case (5):
                        (C.field(C.gx,"instance_globals_x","xstart").value=C.i16(C.i32((C.i32((C.field(C.gx,"instance_globals_x","x_maze_max").value-C.i32(C.field(C.gx,"instance_globals_x","xsize").value)))-1))));
                    break;
                }
                switch(tb) {
                    case (1):
                        (C.field(C.gy,"instance_globals_y","ystart").value=C.i16(3));
                    break;
                    case (3):
                        (C.field(C.gy,"instance_globals_y","ystart").value=C.i16(C.i32((2+(C.i32(Math.trunc(((C.i32((C.i32((C.field(C.gy,"instance_globals_y","y_maze_max").value-2))-C.i32(C.field(C.gy,"instance_globals_y","ysize").value))))/2))))))));
                    break;
                    case (5):
                        (C.field(C.gy,"instance_globals_y","ystart").value=C.i16(C.i32((C.i32((C.field(C.gy,"instance_globals_y","y_maze_max").value-C.i32(C.field(C.gy,"instance_globals_y","ysize").value)))-1))));
                    break;
                }
                if(Number(!((C.i32((C.i32(C.field(C.gx,"instance_globals_x","xstart").value)%2)))))) (()=>{const slot=C.field(C.gx,"instance_globals_x","xstart");const old=slot.value;const next=C.i16((old+1));slot.value=next;return old;})();
                if(Number(!((C.i32((C.i32(C.field(C.gy,"instance_globals_y","ystart").value)%2)))))) (()=>{const slot=C.field(C.gy,"instance_globals_y","ystart");const old=slot.value;const next=C.i16((old+1));slot.value=next;return old;})();
            }
            if(Number(!!(Number(C.i32(C.field(C.gy,"instance_globals_y","ystart").value)<0)||Number(C.i32((C.i32(C.field(C.gy,"instance_globals_y","ystart").value)+C.i32(C.field(C.gy,"instance_globals_y","ysize").value)))>21)))) {
                if(C.field(C.gi,"instance_globals_i","in_mk_themerooms").value) {
                    (C.field(C.gt,"instance_globals_t","themeroom_failed").value=(C.i8(1)));
                    break skipmap;
                }
                /* try to move the start a bit */
                (()=>{const slot=C.field(C.gy,"instance_globals_y","ystart");const old=slot.value;const next=C.i16(C.i32(C.i32(old)+((Number(C.i32(C.field(C.gy,"instance_globals_y","ystart").value)>0))?C.i32((-2)):2)));slot.value=next;return next;})();
                if(Number(C.i32(C.field(C.gy,"instance_globals_y","ysize").value)==21)) (C.field(C.gy,"instance_globals_y","ystart").value=C.i16(0));
                if(Number(!!(Number(C.i32(C.field(C.gy,"instance_globals_y","ystart").value)<0)||Number(C.i32((C.i32(C.field(C.gy,"instance_globals_y","ystart").value)+C.i32(C.field(C.gy,"instance_globals_y","ysize").value)))>21)))) (C.field(C.gy,"instance_globals_y","ystart").value=C.i16(0));
            }
            if(Number(!!(Number(C.i32(C.field(C.gx,"instance_globals_x","xsize").value)<=1)&&Number(C.i32(C.field(C.gy,"instance_globals_y","ysize").value)<=1)))) {
                reset_xystart_size();
            } else {
                let mptyp;
                let terr=C.stackAlloc(C.sizes["terrain"]);
                /* Themed rooms should never overwrite anything */
                if(C.field(C.gi,"instance_globals_i","in_mk_themerooms").value) {
                    let isokp=(C.i8(1));
                    for((C.cell(yAddress,"long long").value=C.i64(C.i32((C.i32(C.field(C.gy,"instance_globals_y","ystart").value)-1))));Number(C.cell(yAddress,"long long").value<C.i64(C.i32((((Number((21)<(C.i32((C.i32(C.field(C.gy,"instance_globals_y","ystart").value)+C.i32(C.field(C.gy,"instance_globals_y","ysize").value)))))?(21):(C.i32((C.i32(C.field(C.gy,"instance_globals_y","ystart").value)+C.i32(C.field(C.gy,"instance_globals_y","ysize").value))))))+1))));(()=>{const slot=C.cell(yAddress,"long long");const old=slot.value;const next=C.i64((old+1n));slot.value=next;return old;})()) for((C.cell(xAddress,"long long").value=C.i64(C.i32((C.i32(C.field(C.gx,"instance_globals_x","xstart").value)-1))));Number(C.cell(xAddress,"long long").value<C.i64(C.i32((((Number((80)<(C.i32((C.i32(C.field(C.gx,"instance_globals_x","xstart").value)+C.i32(C.field(C.gx,"instance_globals_x","xsize").value)))))?(80):(C.i32((C.i32(C.field(C.gx,"instance_globals_x","xstart").value)+C.i32(C.field(C.gx,"instance_globals_x","xsize").value))))))+1))));(()=>{const slot=C.cell(xAddress,"long long");const old=slot.value;const next=C.i64((old+1n));slot.value=next;return old;})()) {
                        if(Number(!(C.isok(C.i16(C.cell(xAddress,"long long").value),C.i16(C.cell(yAddress,"long long").value))))) {
                            (isokp=(C.i8(0)));
                        } else if(Number(!!(Number(!!(Number(!!(Number(C.cell(yAddress,"long long").value<C.i64(C.field(C.gy,"instance_globals_y","ystart").value))||Number(C.cell(yAddress,"long long").value>=C.i64((C.i32((C.i32(C.field(C.gy,"instance_globals_y","ystart").value)+C.i32(C.field(C.gy,"instance_globals_y","ysize").value))))))))||Number(C.cell(xAddress,"long long").value<C.i64(C.field(C.gx,"instance_globals_x","xstart").value))))||Number(C.cell(xAddress,"long long").value>=C.i64((C.i32((C.i32(C.field(C.gx,"instance_globals_x","xstart").value)+C.i32(C.field(C.gx,"instance_globals_x","xsize").value))))))))) {
                            if(Number(!!(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"long long").value)*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"long long").value)*C.sizes["struct rm"]),"rm","typ").value)!=C.STONE)||Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"long long").value)*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"long long").value)*C.sizes["struct rm"]),"rm","roomno").value)!=0)))) (isokp=(C.i8(0)));
                        } else {
                            (mptyp=C.i16(mapfrag_get(C.cell(mfAddress,"struct mapfragment *").value,C.i32(C.i64((C.cell(xAddress,"long long").value-C.i64(C.field(C.gx,"instance_globals_x","xstart").value)))),C.i32(C.i64((C.cell(yAddress,"long long").value-C.i64(C.field(C.gy,"instance_globals_y","ystart").value)))))));
                            if(Number(C.i32(mptyp)>=C.MAX_TYPE)) continue;
                            if(Number(!!((Number(!!(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"long long").value)*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"long long").value)*C.sizes["struct rm"]),"rm","typ").value)!=C.STONE)&&Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"long long").value)*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"long long").value)*C.sizes["struct rm"]),"rm","typ").value)!=C.i32(mptyp)))))||Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"long long").value)*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"long long").value)*C.sizes["struct rm"]),"rm","roomno").value)!=0)))) (isokp=(C.i8(0)));
                        }
                        if(Number(!(isokp))) {
                            if(Number(!!(Number((()=>{const old=tryct;const next=C.i32((old+1));tryct=next;return old;})()<100)&&(Number(!!(Number(lr==C.i32((-1)))||Number(tb==C.i32((-1))))))))) continue redo_maploc;
                            (C.field(C.gt,"instance_globals_t","themeroom_failed").value=(C.i8(1)));
                            break skipmap;
                        }
                    }

                }
                /* Load the map */
                for((C.cell(yAddress,"long long").value=C.i64(C.field(C.gy,"instance_globals_y","ystart").value));Number(C.cell(yAddress,"long long").value<C.i64(((Number((21)<(C.i32((C.i32(C.field(C.gy,"instance_globals_y","ystart").value)+C.i32(C.field(C.gy,"instance_globals_y","ysize").value)))))?(21):(C.i32((C.i32(C.field(C.gy,"instance_globals_y","ystart").value)+C.i32(C.field(C.gy,"instance_globals_y","ysize").value))))))));(()=>{const slot=C.cell(yAddress,"long long");const old=slot.value;const next=C.i64((old+1n));slot.value=next;return old;})()) for((C.cell(xAddress,"long long").value=C.i64(C.field(C.gx,"instance_globals_x","xstart").value));Number(C.cell(xAddress,"long long").value<C.i64(((Number((80)<(C.i32((C.i32(C.field(C.gx,"instance_globals_x","xstart").value)+C.i32(C.field(C.gx,"instance_globals_x","xsize").value)))))?(80):(C.i32((C.i32(C.field(C.gx,"instance_globals_x","xstart").value)+C.i32(C.field(C.gx,"instance_globals_x","xsize").value))))))));(()=>{const slot=C.cell(xAddress,"long long");const old=slot.value;const next=C.i64((old+1n));slot.value=next;return old;})()) {
                    (mptyp=C.i16(mapfrag_get(C.cell(mfAddress,"struct mapfragment *").value,C.i32((C.i64((C.cell(xAddress,"long long").value-C.i64(C.field(C.gx,"instance_globals_x","xstart").value))))),C.i32((C.i64((C.cell(yAddress,"long long").value-C.i64(C.field(C.gy,"instance_globals_y","ystart").value))))))));
                    if(Number(C.i32(mptyp)==C.INVALID_TYPE)) {
                        /* TODO: warn about illegal map char */
                        continue;
                    }
                    if(Number(C.i32(mptyp)>=C.MAX_TYPE)) continue;
                    /* clear out levl: load_common_data may set them */
                    (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"long long").value)*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"long long").value)*C.sizes["struct rm"]),"rm","flags").value=C.u32(0));
                    (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"long long").value)*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"long long").value)*C.sizes["struct rm"]),"rm","horizontal").value=C.u32(0));
                    (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"long long").value)*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"long long").value)*C.sizes["struct rm"]),"rm","roomno").value=C.u32(0));
                    (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xAddress,"long long").value)*(C.sizes["struct rm"]*21))+Number(C.cell(yAddress,"long long").value)*C.sizes["struct rm"]),"rm","edge").value=C.u32(0));
                    (C.cell(((C.SpLev_Map+Number(C.cell(xAddress,"long long").value)*(1*21))+Number(C.cell(yAddress,"long long").value)*1),"char").value=C.i8(1));
                    C.selection_setpoint(C.i16(C.cell(xAddress,"long long").value),C.i16(C.cell(yAddress,"long long").value),sel,1);
                    (C.field(terr,"terrain","ter").value=mptyp);
                    (C.field(terr,"terrain","tlit").value=C.i16(lit));
                    sel_set_ter(C.i16(C.cell(xAddress,"long long").value),C.i16(C.cell(yAddress,"long long").value),terr);
                }

            }
            break;
        }
    }
    mapfrag_free(mfAddress);
    if(Number(!!(C.i32(C.field(C.gi,"instance_globals_i","in_mk_themerooms").value)&&C.i32(C.field(C.gt,"instance_globals_t","themeroom_failed").value)))) {
        /* this mutated xstart and ystart in the process of trying to make a
         * themed room, so undo them */
        reset_xystart_size();
    } else if(has_contents) {
        l_push_wid_hei_table(L,C.i32(C.field(C.gx,"instance_globals_x","xsize").value),C.i32(C.field(C.gy,"instance_globals_y","ysize").value));
        C.nhl_pcall_handle(L,1,0,C.literal("lspo_map"),C.i32(C.NHLpa_panic));
        reset_xystart_size();
    }
    /* return selection where map locations were put */
    C.l_selection_push_copy(L,sel);
    C.selection_free(sel,(C.i8(1)));
    return 1;
    } finally {C.stackRestore(stackFrame); }
}

export function update_croom()
{
    if(Number(!(C.field(C.gc,"instance_globals_c","coder").value))) return;
    if(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","n_subroom").value) (C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value=C.cell((C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","tmproomlist").address+Number(C.i32((C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","n_subroom").value-1)))*8),"struct mkroom *").value);
 else (C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","croom").value=0);
}

export function sp_level_coder_init()
{
    let tmpi;
    let coder=C.alloc(C.u32(BigInt(C.sizes["struct sp_coder"])));
    (C.field(coder,"sp_coder","premapped").value=C.i32((C.i8(0))));
    (C.field(coder,"sp_coder","solidify").value=(C.i8(0)));
    (C.field(coder,"sp_coder","check_inaccessibles").value=(C.i8(0)));
    (C.field(coder,"sp_coder","allow_flips").value=3);
    /* allow flipping level horiz/vert */
    (C.field(coder,"sp_coder","croom").value=0);
    (C.field(coder,"sp_coder","n_subroom").value=1);
    (C.field(coder,"sp_coder","lvl_is_joined").value=(C.i8(0)));
    (C.field(coder,"sp_coder","room_stack").value=0);
    (C.cell(C.splev_init_present,"signed char").value=(C.i8(0)));
    (C.cell(C.icedpools,"signed char").value=(C.i8(0)));
    for((tmpi=0);Number(tmpi<=5);(()=>{const old=tmpi;const next=C.i32((old+1));tmpi=next;return old;})()) {
        (C.cell((C.field(coder,"sp_coder","tmproomlist").address+Number(tmpi)*8),"struct mkroom *").value=0);
        (C.cell((C.field(coder,"sp_coder","failed_room").address+Number(tmpi)*1),"signed char").value=(C.i8(0)));
    }
    update_croom();
    for((tmpi=0);Number(tmpi<10);(()=>{const old=tmpi;const next=C.i32((old+1));tmpi=next;return old;})()) (C.cell((C.container_obj+Number(tmpi)*8),"struct obj *").value=0);

    (C.cell(C.container_idx,"int").value=0);
    (C.cell(C.invent_carrying_monster,"struct monst *").value=0);
    C.memset(C.SpLev_Map,0,BigInt((1*1680)));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","is_maze_lev").value=C.u32(0));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","temperature").value=C.i8((C.i32(C.In_hell(C.field(C.u,"you","uz").address))?1:0)));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","rndmongen").value=C.u32(1));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","deathdrops").value=C.u32(1));
    reset_xystart_size();
    return coder;
}

export const nhl_functions=C=>[[C.literal("message"),C.functionPointer("lspo_message")],[C.literal("monster"),C.functionPointer("lspo_monster")],[C.literal("object"),C.functionPointer("lspo_object")],[C.literal("level_flags"),C.functionPointer("lspo_level_flags")],[C.literal("level_init"),C.functionPointer("lspo_level_init")],[C.literal("engraving"),C.functionPointer("lspo_engraving")],[C.literal("mineralize"),C.functionPointer("lspo_mineralize")],[C.literal("door"),C.functionPointer("lspo_door")],[C.literal("stair"),C.functionPointer("lspo_stair")],[C.literal("ladder"),C.functionPointer("lspo_ladder")],[C.literal("grave"),C.functionPointer("lspo_grave")],[C.literal("altar"),C.functionPointer("lspo_altar")],[C.literal("map"),C.functionPointer("lspo_map")],[C.literal("feature"),C.functionPointer("lspo_feature")],[C.literal("terrain"),C.functionPointer("lspo_terrain")],[C.literal("replace_terrain"),C.functionPointer("lspo_replace_terrain")],[C.literal("room"),C.functionPointer("lspo_room")],[C.literal("corridor"),C.functionPointer("lspo_corridor")],[C.literal("random_corridors"),C.functionPointer("lspo_random_corridors")],[C.literal("gold"),C.functionPointer("lspo_gold")],[C.literal("trap"),C.functionPointer("lspo_trap")],[C.literal("mazewalk"),C.functionPointer("lspo_mazewalk")],[C.literal("drawbridge"),C.functionPointer("lspo_drawbridge")],[C.literal("region"),C.functionPointer("lspo_region")],[C.literal("levregion"),C.functionPointer("lspo_levregion")],[C.literal("exclusion"),C.functionPointer("lspo_exclusion")],[C.literal("wallify"),C.functionPointer("lspo_wallify")],[C.literal("wall_property"),C.functionPointer("lspo_wall_property")],[C.literal("non_diggable"),C.functionPointer("lspo_non_diggable")],[C.literal("non_passwall"),C.functionPointer("lspo_non_passwall")],[C.literal("teleport_region"),C.functionPointer("lspo_teleport_region")],[C.literal("reset_level"),C.functionPointer("lspo_reset_level")],[C.literal("finalize_level"),C.functionPointer("lspo_finalize_level")],[C.literal("gas_cloud"),C.functionPointer("lspo_gas_cloud")],[0,0]];
/* TODO: { "branch", lspo_branch }, */
/* TODO: { "portal", lspo_portal }, */
/* TODO:

 - if des-file used MAZE_ID to start a level, the level needs
   des.level_flags("mazelevel")
 - expose gc.coder->croom or gx.xstart gy.ystart and gx.xsize gy.ysize to lua.
 - detect a "subroom" automatically.
 - new function get_mapchar(x,y) to return the mapchar on map
 - many params should accept their normal type (eg, int or bool), AND "random"
 - automatically add shuffle(array)
 - automatically add align = { "law", "neutral", "chaos" } and shuffle it.
   (remove from lua files)
 - grab the header comments from des-files and add them to the lua files

*/
export function l_register_des(L)
{
    /* register des -table, and functions for it */
    C.lua_createtable(L,0,0);
    C.luaL_setfuncs(L,C.nhl_functions,0);
    C.lua_setglobal(L,C.literal("des"));
}

export function create_des_coder()
{
    if(Number(!(C.field(C.gc,"instance_globals_c","coder").value))) (C.field(C.gc,"instance_globals_c","coder").value=sp_level_coder_init());
}

/*
 * General loader
 */
export function load_special(name)
{
    const stackFrame=C.stackSave();
    try {
    let result=(C.i8(0));
    let sbi=C.stackAlloc(C.sizes["struct nhl_sandbox_info"]); C.fillArray(sbi,"struct nhl_sandbox_info",[2147483648,C.u32(C.i32((C.i32((1*1024))*1024))),C.u32(0),C.u32(C.i32((C.i32((1*1024))*1024)))]);
    give_up: {
        create_des_coder();
        if(Number(!(C.load_lua(name,sbi)))) break give_up;
        link_doors_rooms();
        remove_boundary_syms();
        /* TODO: ensure_way_out() needs rewrite */
        if(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","check_inaccessibles").value) ensure_way_out();
        map_cleanup();
        /* FIXME: Ideally, we want this call to only cover areas of the map
     * which were not inserted directly by the special level file (see
     * the insect legs on Baalzebub's level, for instance). Since that
     * is currently not possible, we overload the corrmaze flag for this
     * purpose.
     */
        if(Number(!(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","corrmaze").value))) C.wallification(C.i16(1),C.i16(0),C.i16(C.i32((80-1))),C.i16(C.i32((21-1))));
        flip_level_rnd(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","allow_flips").value,(C.i8(0)));
        C.count_level_features();
        if(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","solidify").value) solidify_map();
        /* This must be done before premap_detect(),
     * otherwise branch stairs won't be premapped. */
        C.fixup_special();
        if(C.field(C.field(C.gc,"instance_globals_c","coder").value,"sp_coder","premapped").value) C.premap_detect();
        (result=(C.i8(1)));
    }
    do {
        if(C.field(C.gc,"instance_globals_c","coder").value) C.free((C.field(C.gc,"instance_globals_c","coder").value));
    } while(0);
    (C.field(C.gc,"instance_globals_c","coder").value=0);
    return result;
    } finally {C.stackRestore(stackFrame); }
}

/*sp_lev.c*/
export const initializers={splev_init_present,icedpools,SpLev_Map,container_idx,container_obj,invent_carrying_monster,is_ok_location_func,room_types,trap_types,floodfillchk_match_under_typ,nhl_functions};
