import { C } from '../c-runtime/context.js';
/* NetHack 5.0	mkmaze.c	$NHDT-Date: 1745114235 2025/04/19 17:57:15 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.179 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Pasi Kallinen, 2018. */
/* NetHack may be freely redistributed.  See license for details. */
/* adjust a coordinate one step in the specified direction */
/* used to determine if wall spines can join this location */
export function iswall(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let type;
    if(Number(!(C.isok(x,y)))) return 0;
    (type=C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value));
    return (Number(!!(Number(!!(Number(!!(Number(!!(Number(!!((Number(!!((type)&&Number((type)<=C.DBWALL))))||(Number((type)==C.DOOR))))||Number(type==C.LAVAWALL)))||Number(type==C.WATER)))||Number(type==C.SDOOR)))||Number(type==C.IRONBARS))));
}

/* used to determine if wall spines can join this location */
export function iswall_or_stone(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    /* out of bounds = stone */
    if(Number(!(C.isok(x,y)))) return 1;
    return (Number(!!(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.STONE)||iswall(x,y))));
}

/* return TRUE if out of bounds, wall or rock */
export function is_solid(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    return C.i8((Number(!!(Number(!(C.isok(x,y)))||(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))<=C.DBWALL))))));
}

/* set map terrain type, handling lava lit, ice melt timers, etc */
export function set_levltyp(x,y,newtyp)
{
    x=C.i16(x);
    y=C.i16(y);
    newtyp=C.i8(newtyp);
    if(Number(!!(Number(!!(C.isok(x,y)&&Number(C.i32(newtyp)>=C.STONE)))&&Number(C.i32(newtyp)<C.MAX_TYPE)))) {
        let oldtyp=C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value;
        /* hack for secret doors in garden theme rooms */
        if(Number(!!(Number(C.i32(oldtyp)==C.SDOOR)&&Number(C.i32(newtyp)==C.AIR)))) {
            /* levl[][].typ stays SDOOR rather than change to AIR */
            (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","candig").value=C.u32(1));
            return (C.i8(1));
        }
        if((Number(!!(C.i32(C.field(C.iflags,"instance_flags","debug_overwrite_stairs").value)||Number(!((Number(!!(Number(C.i32((oldtyp))==C.LADDER)||Number(C.i32((oldtyp))==C.STAIRS)))))))))) {
            /* typ==ICE || (typ==DRAWBRIDGE_UP && drawbridgemask==DB_ICE) */
            let was_ice=C.is_ice(x,y);
            (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value=newtyp);
            /* TODO?
             *  if oldtyp used flags or horizontal differently from
             *  the way newtyp will use them, clear them.
             */
            if((Number(!!(Number(C.i32((newtyp))==C.LAVAPOOL)||Number(C.i32((newtyp))==C.LAVAWALL))))) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","lit").value=C.u32(1));
            /* [what about IS_LAVA(oldtyp)=>.lit = 0?] */
            if(Number(!!(C.i32(was_ice)&&Number(C.i32(newtyp)!=C.ICE)))) {
                /* frozen corpses resume rotting, no more ice to melt away */
                C.obj_ice_effects(x,y,(C.i8(1)));
                C.spot_stop_timers(x,y,C.i16(C.MELT_ICE_AWAY));
            }
            if(Number(!!((Number((Number(C.i32((oldtyp))==C.FOUNTAIN))!=(Number(C.i32((newtyp))==C.FOUNTAIN))))||(Number((Number(C.i32((oldtyp))==C.SINK))!=(Number(C.i32((newtyp))==C.SINK))))))) C.count_level_features();
            /* level.flags.nfountains,nsinks */
            return (C.i8(1));
        }
        /*EXTRA_SANITY_CHECKS*/
    }
    return (C.i8(0));
}

/* set map terrain type and light state */
export function set_levltyp_lit(x,y,typ,lit)
{
    x=C.i16(x);
    y=C.i16(y);
    typ=C.i8(typ);
    lit=C.i8(lit);
    let ret=set_levltyp(x,y,typ);
    if(Number(!!(C.i32(ret)&&C.isok(x,y)))) {
        if(Number(C.i32(lit)!=C.i32((-2)))) {
            /*EXTRA_SANITY_CHECKS*/
            if((Number(!!(Number(C.i32((typ))==C.LAVAPOOL)||Number(C.i32((typ))==C.LAVAWALL))))) (lit=C.i8(1));
 else if(Number(C.i32(lit)==C.i32((-1)))) (lit=C.i8(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),139,(C.literal("set_levltyp_lit"))),C.rn2(2))):C.rn2(2)))));
            (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","lit").value=C.u32(lit));
        }
    }
    return ret;
}

/*
 * Return 1 (not TRUE - we're doing bit vectors here) if we want to extend
 * a wall spine in the (dx,dy) direction.  Return 0 otherwise.
 *
 * To extend a wall spine in that direction, first there must be a wall there.
 * Then, extend a spine unless the current position is surrounded by walls
 * in the direction given by (dx,dy).  E.g. if 'x' is our location, 'W'
 * a wall, '.' a room, 'a' anything (we don't care), and our direction is
 * (0,1) - South or down - then:
 *
 *              a a a
 *              W x W           This would not extend a spine from x down
 *              W W W           (a corridor of walls is formed).
 *
 *              a a a
 *              W x W           This would extend a spine from x down.
 *              . W W
 */
export function extend_spine(locale,wall_there,dx,dy)
{
    locale=C.ptr(locale);
    wall_there=C.i32(wall_there);
    dx=C.i32(dx);
    dy=C.i32(dy);
    let spine; let nx; let ny;
    (nx=C.i32((1+dx)));
    (ny=C.i32((1+dy)));
    if(wall_there) {
        /* wall in that direction */
        if(dx) {
            if(Number(!!(Number(!!(Number(!!(C.cell(((locale+Number(1)*(4*3))+Number(0)*4),"int").value&&C.cell(((locale+Number(1)*(4*3))+Number(2)*4),"int").value))&&C.cell(((locale+Number(nx)*(4*3))+Number(0)*4),"int").value))&&C.cell(((locale+Number(nx)*(4*3))+Number(2)*4),"int").value))) {
                /* EW are wall/stone */
                /* diag are wall/stone */
                (spine=0);
            } else {
                (spine=1);
            }
        } else {
            /* dy */
            if(Number(!!(Number(!!(Number(!!(C.cell(((locale+Number(0)*(4*3))+Number(1)*4),"int").value&&C.cell(((locale+Number(2)*(4*3))+Number(1)*4),"int").value))&&C.cell(((locale+Number(0)*(4*3))+Number(ny)*4),"int").value))&&C.cell(((locale+Number(2)*(4*3))+Number(ny)*4),"int").value))) {
                /* NS are wall/stone */
                /* diag are wall/stone */
                (spine=0);
            } else {
                (spine=1);
            }
        }
    } else {
        (spine=0);
    }
    return spine;
}

/* Remove walls totally surrounded by stone */
export function wall_cleanup(x1,y1,x2,y2)
{
    x1=C.i16(x1);
    y1=C.i16(y1);
    x2=C.i16(x2);
    y2=C.i16(y2);
    let type;
    let x; let y;
    let lev;
    /* sanity check on incoming variables */
    if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(x1)<0)||Number(C.i32(x2)>=80)))||Number(C.i32(x1)>C.i32(x2))))||Number(C.i32(y1)<0)))||Number(C.i32(y2)>=21)))||Number(C.i32(y1)>C.i32(y2))))) C.variadic(0,C.literal("wall_cleanup: bad bounds (%d,%d) to (%d,%d)"),C.i32(x1),C.i32(y1),C.i32(x2),C.i32(y2));
    /* change walls surrounded by rock to rock. */
    for((x=x1);Number(C.i32(x)<=C.i32(x2));((x=C.i16((x+1)))-1)) for((y=y1);Number(C.i32(y)<=C.i32(y2));((y=C.i16((y+1)))-1)) {
        if((Number(!!(Number(!!(Number(!!(Number(C.i32((x))>=C.i32((C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","x1").value)))&&Number(C.i32((x))<=C.i32((C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","x2").value)))))&&Number(C.i32((y))>=C.i32((C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","y1").value)))))&&Number(C.i32((y))<=C.i32((C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","y2").value))))))) continue;
        (lev=((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]));
        (type=C.u8(C.field(lev,"rm","typ").value));
        if(Number(!!((Number(!!(C.i32((type))&&Number(C.i32((type))<=C.DBWALL))))&&Number(C.i32(type)!=C.DBWALL)))) {
            if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(C.i32(is_solid(C.i16(C.i32((C.i32(x)-1))),C.i16(C.i32((C.i32(y)-1)))))&&C.i32(is_solid(C.i16(C.i32((C.i32(x)-1))),y))))&&C.i32(is_solid(C.i16(C.i32((C.i32(x)-1))),C.i16(C.i32((C.i32(y)+1)))))))&&C.i32(is_solid(x,C.i16(C.i32((C.i32(y)-1)))))))&&C.i32(is_solid(x,C.i16(C.i32((C.i32(y)+1)))))))&&C.i32(is_solid(C.i16(C.i32((C.i32(x)+1))),C.i16(C.i32((C.i32(y)-1)))))))&&C.i32(is_solid(C.i16(C.i32((C.i32(x)+1))),y))))&&C.i32(is_solid(C.i16(C.i32((C.i32(x)+1))),C.i16(C.i32((C.i32(y)+1)))))))) (C.field(lev,"rm","typ").value=C.i8(C.STONE));
        }
    }

}

/* Correct wall types so they extend and connect to each other */
export function fix_wall_spines(x1,y1,x2,y2)
{
    x1=C.i16(x1);
    y1=C.i16(y1);
    x2=C.i16(x2);
    y2=C.i16(y2);
    const stackFrame=C.stackSave();
    try {
    let type;
    let x; let y;
    let lev;
    let loc_f;
    let bits;
    let locale=C.stackAlloc(((4*3)*3));
    /* rock or wall status surrounding positions */
    /*
     * Value 0 represents a free-standing wall.  It could be anything,
     * so even though this table says VWALL, we actually leave whatever
     * typ was there alone.
     */
    
    /* sanity check on incoming variables */
    if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(x1)<0)||Number(C.i32(x2)>=80)))||Number(C.i32(x1)>C.i32(x2))))||Number(C.i32(y1)<0)))||Number(C.i32(y2)>=21)))||Number(C.i32(y1)>C.i32(y2))))) C.variadic(1,C.literal("wall_extends: bad bounds (%d,%d) to (%d,%d)"),C.i32(x1),C.i32(y1),C.i32(x2),C.i32(y2));
    /* set the correct wall type. */
    for((x=x1);Number(C.i32(x)<=C.i32(x2));((x=C.i16((x+1)))-1)) for((y=y1);Number(C.i32(y)<=C.i32(y2));((y=C.i16((y+1)))-1)) {
        (lev=((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]));
        (type=C.u8(C.field(lev,"rm","typ").value));
        if(Number(!((Number(!!((Number(!!(C.i32((type))&&Number(C.i32((type))<=C.DBWALL))))&&Number(C.i32(type)!=C.DBWALL))))))) continue;
        /* set the locations TRUE if rock or wall or out of bounds */
        (loc_f=((Number(!!(Number(!!(Number(!!(Number(C.i32((x))>=C.i32((C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","x1").value)))&&Number(C.i32((x))<=C.i32((C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","x2").value)))))&&Number(C.i32((y))>=C.i32((C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","y1").value)))))&&Number(C.i32((y))<=C.i32((C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","y2").value))))))?iswall:iswall_or_stone));
        /* for baalz insect */
        (C.cell(((locale+Number(0)*(4*3))+Number(0)*4),"int").value=((loc_f))(C.i16(C.i32((C.i32(x)-1))),C.i16(C.i32((C.i32(y)-1)))));
        (C.cell(((locale+Number(1)*(4*3))+Number(0)*4),"int").value=((loc_f))(x,C.i16(C.i32((C.i32(y)-1)))));
        (C.cell(((locale+Number(2)*(4*3))+Number(0)*4),"int").value=((loc_f))(C.i16(C.i32((C.i32(x)+1))),C.i16(C.i32((C.i32(y)-1)))));
        (C.cell(((locale+Number(0)*(4*3))+Number(1)*4),"int").value=((loc_f))(C.i16(C.i32((C.i32(x)-1))),y));
        (C.cell(((locale+Number(2)*(4*3))+Number(1)*4),"int").value=((loc_f))(C.i16(C.i32((C.i32(x)+1))),y));
        (C.cell(((locale+Number(0)*(4*3))+Number(2)*4),"int").value=((loc_f))(C.i16(C.i32((C.i32(x)-1))),C.i16(C.i32((C.i32(y)+1)))));
        (C.cell(((locale+Number(1)*(4*3))+Number(2)*4),"int").value=((loc_f))(x,C.i16(C.i32((C.i32(y)+1)))));
        (C.cell(((locale+Number(2)*(4*3))+Number(2)*4),"int").value=((loc_f))(C.i16(C.i32((C.i32(x)+1))),C.i16(C.i32((C.i32(y)+1)))));
        /* determine if wall should extend to each direction NSEW */
        (bits=C.i32((C.i32((C.i32(((C.i32((extend_spine(locale,iswall(x,C.i16(C.i32((C.i32(y)-1)))),0,C.i32((-1)))<<3)))|(C.i32((extend_spine(locale,iswall(x,C.i16(C.i32((C.i32(y)+1)))),0,1)<<2)))))|(C.i32((extend_spine(locale,iswall(C.i16(C.i32((C.i32(x)+1))),y),1,0)<<1)))))|extend_spine(locale,iswall(C.i16(C.i32((C.i32(x)-1))),y),C.i32((-1)),0))));
        /* don't change typ if wall is free-standing */
        if(bits) (C.field(lev,"rm","typ").value=C.i8(C.cell((C.staticAddress("spine_array")+Number(bits)*2),"short").value));
    }

    } finally {C.stackRestore(stackFrame); }
}

export function wallification(x1,y1,x2,y2)
{
    x1=C.i16(x1);
    y1=C.i16(y1);
    x2=C.i16(x2);
    y2=C.i16(y2);
    wall_cleanup(x1,y1,x2,y2);
    fix_wall_spines(x1,y1,x2,y2);
}

export function okay(x,y,dir)
{
    x=C.i16(x);
    y=C.i16(y);
    dir=C.i16(dir);
    do {
        switch(C.i32(dir)) {
            case (0):
                ((y)=C.i16(((y)-1)));
            break;
            case (1):
                (((x)=C.i16(((x)+1)))-1);
            break;
            case (2):
                (((y)=C.i16(((y)+1)))-1);
            break;
            case (3):
                ((x)=C.i16(((x)-1)));
            break;
            default:
                C.variadic(2,C.literal("mz_move: bad direction %d"),C.i32(dir));
        }
    } while(0);
    do {
        switch(C.i32(dir)) {
            case (0):
                ((y)=C.i16(((y)-1)));
            break;
            case (1):
                (((x)=C.i16(((x)+1)))-1);
            break;
            case (2):
                (((y)=C.i16(((y)+1)))-1);
            break;
            case (3):
                ((x)=C.i16(((x)-1)));
            break;
            default:
                C.variadic(3,C.literal("mz_move: bad direction %d"),C.i32(dir));
        }
    } while(0);
    if(Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(x)<3)||Number(C.i32(y)<3)))||Number(C.i32(x)>C.field(C.gx,"instance_globals_x","x_maze_max").value)))||Number(C.i32(y)>C.field(C.gy,"instance_globals_y","y_maze_max").value)))||Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)!=C.STONE)))) return (C.i8(0));
    return (C.i8(1));
}

/* find random starting point for maze generation */
export function maze0xy(cc)
{
    cc=C.ptr(cc);
    (C.field(cc,"nhcoord","x").value=C.i16(C.i32((3+C.i32((2*((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),311,(C.literal("maze0xy"))),C.rn2(C.i32(((C.i32((C.field(C.gx,"instance_globals_x","x_maze_max").value>>1)))-1))))):C.rn2(C.i32(((C.i32((C.field(C.gx,"instance_globals_x","x_maze_max").value>>1)))-1)))))))))));
    (C.field(cc,"nhcoord","y").value=C.i16(C.i32((3+C.i32((2*((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),312,(C.literal("maze0xy"))),C.rn2(C.i32(((C.i32((C.field(C.gy,"instance_globals_y","y_maze_max").value>>1)))-1))))):C.rn2(C.i32(((C.i32((C.field(C.gy,"instance_globals_y","y_maze_max").value>>1)))-1)))))))))));
    return;
}

export function is_exclusion_zone(type,x,y)
{
    type=C.i16(type);
    x=C.i16(x);
    y=C.i16(y);
    let ez=C.field(C.sve,"instance_globals_saved_e","exclusion_zones").value;
    while(ez) {
        if(Number(!!((Number(!!(Number(!!((Number(!!(Number(C.i32(type)==C.LR_DOWNTELE)&&(Number(!!(Number(C.i32(C.field(ez,"exclusion_zone","zonetype").value)==C.LR_DOWNTELE)||Number(C.i32(C.field(ez,"exclusion_zone","zonetype").value)==C.LR_TELE)))))))||(Number(!!(Number(C.i32(type)==C.LR_UPTELE)&&(Number(!!(Number(C.i32(C.field(ez,"exclusion_zone","zonetype").value)==C.LR_UPTELE)||Number(C.i32(C.field(ez,"exclusion_zone","zonetype").value)==C.LR_TELE)))))))))||Number(C.i32(type)==C.i32(C.field(ez,"exclusion_zone","zonetype").value)))))&&(Number(!!(Number(!!(Number(!!(Number(C.i32((x))>=C.i32((C.field(ez,"exclusion_zone","lx").value)))&&Number(C.i32((x))<=C.i32((C.field(ez,"exclusion_zone","hx").value)))))&&Number(C.i32((y))>=C.i32((C.field(ez,"exclusion_zone","ly").value)))))&&Number(C.i32((y))<=C.i32((C.field(ez,"exclusion_zone","hy").value))))))))) return (C.i8(1));
        (ez=C.field(ez,"exclusion_zone","next").value);
    }
    return (C.i8(0));
}

/*
 * Bad if:
 *      pos is occupied OR
 *      pos is inside restricted region (nlx,nly,nhx,nhy) OR
 *      NOT (pos is corridor and a maze level OR pos is a room OR pos is air)
 */
export function bad_location(x,y,nlx,nly,nhx,nhy)
{
    x=C.i16(x);
    y=C.i16(y);
    nlx=C.i16(nlx);
    nly=C.i16(nly);
    nhx=C.i16(nhx);
    nhy=C.i16(nhy);
    return C.i8((Number(!!(Number(!!(C.i32(C.occupied(x,y))||(Number(!!(Number(!!(Number(!!(Number(C.i32((x))>=C.i32((nlx)))&&Number(C.i32((x))<=C.i32((nhx)))))&&Number(C.i32((y))>=C.i32((nly)))))&&Number(C.i32((y))<=C.i32((nhy))))))))||Number(!((Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.CORR)&&C.i32(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","is_maze_lev").value))))||Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.ROOM)))||Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.AIR))))))))));
}

/* pick a location in area (lx, ly, hx, hy) but not in (nlx, nly, nhx, nhy)
   and place something (based on rtype) in that region */
export function place_lregion(lx,ly,hx,hy,nlx,nly,nhx,nhy,rtype,lev)
{
    lx=C.i16(lx);
    ly=C.i16(ly);
    hx=C.i16(hx);
    hy=C.i16(hy);
    nlx=C.i16(nlx);
    nly=C.i16(nly);
    nhx=C.i16(nhx);
    nhy=C.i16(nhy);
    rtype=C.i16(rtype);
    lev=C.ptr(lev);
    let trycnt;
    let oneshot;
    let x; let y;
    if(Number(!(lx))) {
        /* default to whole level */
        /*
         * if there are rooms and this a branch, let place_branch choose
         * the branch location (to avoid putting branches in corridors).
         */
        if(Number(!!(Number(C.i32(rtype)==C.LR_BRANCH)&&C.field(C.svn,"instance_globals_saved_n","nroom").value))) {
            C.place_branch(C.Is_branchlev(C.field(C.u,"you","uz").address),C.i16(0),C.i16(0));
            return;
        }
        (lx=C.i16(1));
        /* column 0 is not used */
        (hx=C.i16(C.i32((80-1))));
        (ly=C.i16(0));
        /* 3.6.0 and earlier erroneously had 1 here */
        (hy=C.i16(C.i32((21-1))));
    }
    /* clamp the area to the map */
    if(Number(C.i32(lx)<1)) (lx=C.i16(1));
    if(Number(C.i32(hx)>C.i32((80-1)))) (hx=C.i16(C.i32((80-1))));
    if(Number(C.i32(ly)<0)) (ly=C.i16(0));
    if(Number(C.i32(hy)>C.i32((21-1)))) (hy=C.i16(C.i32((21-1))));
    /* first a probabilistic approach */
    (oneshot=C.i8((Number(!!(Number(C.i32(lx)==C.i32(hx))&&Number(C.i32(ly)==C.i32(hy)))))));
    for((trycnt=0);Number(trycnt<200);((trycnt=C.i32((trycnt+1)))-1)) {
        (x=C.i16((C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),396,(C.literal("place_lregion"))),C.rn2(C.i32(((C.i32((C.i32(hx)-C.i32(lx))))+1))))):C.rn2(C.i32(((C.i32((C.i32(hx)-C.i32(lx))))+1)))))+C.i32((lx)))))));
        (y=C.i16((C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),397,(C.literal("place_lregion"))),C.rn2(C.i32(((C.i32((C.i32(hy)-C.i32(ly))))+1))))):C.rn2(C.i32(((C.i32((C.i32(hy)-C.i32(ly))))+1)))))+C.i32((ly)))))));
        if(put_lregion_here(x,y,nlx,nly,nhx,nhy,rtype,oneshot,lev)) return;
    }
    /* then a deterministic one */
    for((x=lx);Number(C.i32(x)<=C.i32(hx));((x=C.i16((x+1)))-1)) for((y=ly);Number(C.i32(y)<=C.i32(hy));((y=C.i16((y+1)))-1)) if(put_lregion_here(x,y,nlx,nly,nhx,nhy,rtype,(C.i8(1)),lev)) return;


    C.variadic(4,C.literal("Couldn't place lregion type %d!"),C.i32(rtype));
}

export function put_lregion_here(x,y,nlx,nly,nhx,nhy,rtype,oneshot,lev)
{
    x=C.i16(x);
    y=C.i16(y);
    nlx=C.i16(nlx);
    nly=C.i16(nly);
    nhx=C.i16(nhx);
    nhy=C.i16(nhy);
    rtype=C.i16(rtype);
    oneshot=C.i8(oneshot);
    lev=C.ptr(lev);
    let mtmp;
    if(Number(!!(C.i32(bad_location(x,y,nlx,nly,nhx,nhy))||C.i32(is_exclusion_zone(rtype,x,y))))) {
        if(Number(!(oneshot))) {
            return (C.i8(0));
            /* caller should try again */
        } else {
            /* Must make do with the only location possible;
               avoid failure due to a misplaced trap.
               It might still fail if there's a dungeon feature here. */
            let t=C.t_at(x,y);
            if(Number(!!(t&&Number(!((Number(!!(Number(C.i32((C.field(t,"trap","ttyp").value))==C.MAGIC_PORTAL)||Number(C.i32((C.field(t,"trap","ttyp").value))==C.VIBRATING_SQUARE))))))))) {
                if(Number(!!((Number(((mtmp=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value)))!=0))&&C.i32(C.field(mtmp,"monst","mtrapped").value)))) (C.field(mtmp,"monst","mtrapped").value=C.u32(0));
                C.deltrap(t);
            }
            if(Number(!!(C.i32(bad_location(x,y,nlx,nly,nhx,nhy))||C.i32(is_exclusion_zone(rtype,x,y))))) return (C.i8(0));
        }
    }
    switch(C.i32(rtype)) {
        case (C.LR_TELE):
            case (C.LR_UPTELE):
                case (C.LR_DOWNTELE):
                    /* "something" means the player in this case */
                    if(Number(((mtmp=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value)))!=0)) {
                        /* move the monster if no choice, or just try again */
                        if(oneshot) {
                            if(Number(!(C.rloc(mtmp,C.u32(4))))) C.m_into_limbo(mtmp);
                        } else return (C.i8(0));
                    }
        C.u_on_newpos(x,y);
        break;
        case (C.LR_PORTAL):
            mkportal(x,y,C.field(lev,"d_level","dnum").value,C.field(lev,"d_level","dlevel").value);
        break;
        case (C.LR_DOWNSTAIR):
            case (C.LR_UPSTAIR):
                C.mkstairs(x,y,C.i8(rtype),0,(C.i8(0)));
        break;
        case (C.LR_BRANCH):
            C.place_branch(C.Is_branchlev(C.field(C.u,"you","uz").address),x,y);
        break;
    }
    return (C.i8(1));
}

/* fix up Baalzebub's lair, which depicts a level-sized beetle;
   its legs are walls within solid rock--regular wallification
   classifies them as superfluous and gets rid of them */
export function baalz_fixup()
{
    let mtmp;
    let x; let y; let lastx; let lasty;
    /*
     * baalz level's nondiggable region surrounds the "insect" and rooms.
     * The outermost perimeter of that region is subject to wall cleanup
     * (hence 'x + 1' and 'y + 1' for starting don't-clean column and row,
     * 'lastx - 1' and 'lasty - 1' for ending don't-clean column and row)
     * and the interior is protected against that (in wall_cleanup()).
     *
     * Assumes level.flags.corrmaze is True, otherwise the bug legs will
     * have already been "cleaned" away by general wallification.
     */
    /* find low and high x for to-be-wallified portion of level */
    (y=C.i32(Math.trunc((21/2))));
    for((lastx=(x=0));Number(x<80);(x=C.i32((x+1)))) if(Number((C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value)&8)))!=0)) {
        if(Number(!(lastx))) (C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","x1").value=C.i16(C.i32((x+1))));
        (lastx=x);
    }

    (C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","x2").value=C.i16(C.i32(((((Number(lastx>C.i32(C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","x1").value)))?lastx:x))-1))));
    /* find low and high y for to-be-wallified portion of level */
    (x=C.i32(C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","x1").value));
    for((lasty=(y=0));Number(y<21);(y=C.i32((y+1)))) if(Number((C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value)&8)))!=0)) {
        if(Number(!(lasty))) (C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","y1").value=C.i16(C.i32((y+1))));
        (lasty=y);
    }

    (C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","y2").value=C.i16(C.i32(((((Number(lasty>C.i32(C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","y1").value)))?lasty:y))-1))));
    /* two pools mark where special post-wallify fix-ups are needed */
    for((x=C.i32(C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","x1").value));Number(x<=C.i32(C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","x2").value));(x=C.i32((x+1)))) for((y=C.i32(C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","y1").value));Number(y<=C.i32(C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","y2").value));(y=C.i32((y+1)))) if(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.POOL)) {
        (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value=C.i8(C.HWALL));
        if(Number(C.i32(C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","delarea").address,"anonymous_18","x1").value)==80)) ((C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","delarea").address,"anonymous_18","x1").value=C.i16(x)),(C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","delarea").address,"anonymous_18","y1").value=C.i16(y)));
 else ((C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","delarea").address,"anonymous_18","x2").value=C.i16(x)),(C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","delarea").address,"anonymous_18","y2").value=C.i16(y)));
    } else if(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.IRONBARS)) {
        /* novelty effect; allowing digging in front of 'eyes' */
        if(Number(!!(C.isok(C.i16(C.i32((x-1))),C.i16(y))&&Number((C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((x-1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value)&8)))!=0)))) {
            (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((x-1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value=C.u32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((x-1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value&C.i32((~8))));
            if(C.isok(C.i16(C.i32((x-2))),C.i16(y))) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((x-2)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value=C.u32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((x-2)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value&C.i32((~8))));
        } else if(Number(!!(C.isok(C.i16(C.i32((x+1))),C.i16(y))&&Number((C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((x+1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value)&8)))!=0)))) {
            (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((x+1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value=C.u32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((x+1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value&C.i32((~8))));
            if(C.isok(C.i16(C.i32((x+2))),C.i16(y))) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((x+2)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value=C.u32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((x+2)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value&C.i32((~8))));
        }
    }


    wallification(C.i16(((Number((C.i32((C.i32(C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","x1").value)-2)))>(1))?(C.i32((C.i32(C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","x1").value)-2))):(1)))),C.i16(((Number((C.i32((C.i32(C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","y1").value)-2)))>(0))?(C.i32((C.i32(C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","y1").value)-2))):(0)))),C.i16(((Number((C.i32((C.i32(C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","x2").value)+2)))<(C.i32((80-1))))?(C.i32((C.i32(C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","x2").value)+2))):(C.i32((80-1)))))),C.i16(((Number((C.i32((C.i32(C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","y2").value)+2)))<(C.i32((21-1))))?(C.i32((C.i32(C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","y2").value)+2))):(C.i32((21-1)))))));
    /* bughack hack for rear-most legs on baalz level; first joint on
       both top and bottom gets a bogus extra connection to room area,
       producing unwanted rectangles; change back to separated legs */
    ((x=C.i32(C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","delarea").address,"anonymous_18","x1").value)),(y=C.i32(C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","delarea").address,"anonymous_18","y1").value)));
    if(Number(!!(Number(!!(Number(!!(C.isok(C.i16(x),C.i16(y))&&(Number(!!(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.TLWALL)||Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.TRWALL))))))&&C.isok(C.i16(x),C.i16(C.i32((y+1))))))&&Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((y+1)))*C.sizes["struct rm"]),"rm","typ").value)==C.TUWALL)))) {
        (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value=C.i8(((Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.TLWALL))?C.BRCORNER:C.BLCORNER)));
        (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((y+1)))*C.sizes["struct rm"]),"rm","typ").value=C.i8(C.HWALL));
        if(Number(((mtmp=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value)))!=0)) C.rloc(mtmp,C.u32(C.i32((1|4))));
        /* something at temporary pool... */
    }
    ((x=C.i32(C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","delarea").address,"anonymous_18","x2").value)),(y=C.i32(C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","delarea").address,"anonymous_18","y2").value)));
    if(Number(!!(Number(!!(Number(!!(C.isok(C.i16(x),C.i16(y))&&(Number(!!(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.TLWALL)||Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.TRWALL))))))&&C.isok(C.i16(x),C.i16(C.i32((y-1))))))&&Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((y-1)))*C.sizes["struct rm"]),"rm","typ").value)==C.TDWALL)))) {
        (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value=C.i8(((Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.TLWALL))?C.TRCORNER:C.TLCORNER)));
        (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((y-1)))*C.sizes["struct rm"]),"rm","typ").value=C.i8(C.HWALL));
        if(Number(((mtmp=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value)))!=0)) C.rloc(mtmp,C.u32(C.i32((1|4))));
        /* something at temporary pool... */
    }
    /* reset bughack region; set low end to <COLNO,ROWNO> so that
       within_bounded_region() in fix_wall_spines() will fail
       most quickly--on its first test--when loading other levels */
    (C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","x1").value=(C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","delarea").address,"anonymous_18","x1").value=C.i16(80)));
    (C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","y1").value=(C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","delarea").address,"anonymous_18","y1").value=C.i16(21)));
    (C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","x2").value=(C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","delarea").address,"anonymous_18","x2").value=C.i16(0)));
    (C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","inarea").address,"anonymous_17","y2").value=(C.field(C.field(C.field(C.gb,"instance_globals_b","bughack").address,"lev_region","delarea").address,"anonymous_18","y2").value=C.i16(0)));
}

/* this is special stuff that the level compiler cannot (yet) handle */
export function fixup_special()
{
    const stackFrame=C.stackSave();
    try {
    let r=C.field(C.gl,"instance_globals_l","lregions").value;
    let sp;
    let lev=C.stackAlloc(C.sizes["struct d_level"]);
    let x; let y;
    let croom;
    let added_branch=(C.i8(0));
    if(Number(!!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address))))))||((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address))))))))) {
        (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","hero_memory").value=C.u32(0));
        /* water level is an odd beast - it has to be set up
           before calling place_lregions etc. */
        setup_waterlevel();
    }
    for((x=0);Number(x<C.field(C.gn,"instance_globals_n","num_lregions").value);(((x=C.i32((x+1)))-1),((r=C.ptr((r+Number(C.sizes["lev_region"]))))-Number(C.sizes["lev_region"])))) {
        switch(C.i32(C.field(r,"lev_region","rtype").value)) {
            case (C.LR_BRANCH):
                (added_branch=(C.i8(1)));
            place_lregion(C.field(C.field(r,"lev_region","inarea").address,"anonymous_17","x1").value,C.field(C.field(r,"lev_region","inarea").address,"anonymous_17","y1").value,C.field(C.field(r,"lev_region","inarea").address,"anonymous_17","x2").value,C.field(C.field(r,"lev_region","inarea").address,"anonymous_17","y2").value,C.field(C.field(r,"lev_region","delarea").address,"anonymous_18","x1").value,C.field(C.field(r,"lev_region","delarea").address,"anonymous_18","y1").value,C.field(C.field(r,"lev_region","delarea").address,"anonymous_18","x2").value,C.field(C.field(r,"lev_region","delarea").address,"anonymous_18","y2").value,C.field(r,"lev_region","rtype").value,lev);
            break; /* source goto place_it joins the placement body then exits switch */
            case (C.LR_PORTAL):
                if(Number(!!(Number(C.i32(C.cell(C.field(C.field(r,"lev_region","rname").address,"str_or_len","str").value,"char").value)>=48)&&Number(C.i32(C.cell(C.field(C.field(r,"lev_region","rname").address,"str_or_len","str").value,"char").value)<=57)))) {
                    /* "chutes and ladders" */
                    C.copy(lev,C.field(C.u,"you","uz").address,C.sizes["struct d_level"]);
                    (C.field(lev,"d_level","dlevel").value=C.i16(C.atoi(C.field(C.field(r,"lev_region","rname").address,"str_or_len","str").value)));
                } else {
                    (sp=C.find_level(C.field(C.field(r,"lev_region","rname").address,"str_or_len","str").value));
                    C.copy(lev,C.field(sp,"s_level","dlevel").address,C.sizes["struct d_level"]);
                }
            ;
            /*FALLTHRU*/
            case (C.LR_UPSTAIR):
                case (C.LR_DOWNSTAIR):
                    place_lregion(C.field(C.field(r,"lev_region","inarea").address,"anonymous_17","x1").value,C.field(C.field(r,"lev_region","inarea").address,"anonymous_17","y1").value,C.field(C.field(r,"lev_region","inarea").address,"anonymous_17","x2").value,C.field(C.field(r,"lev_region","inarea").address,"anonymous_17","y2").value,C.field(C.field(r,"lev_region","delarea").address,"anonymous_18","x1").value,C.field(C.field(r,"lev_region","delarea").address,"anonymous_18","y1").value,C.field(C.field(r,"lev_region","delarea").address,"anonymous_18","x2").value,C.field(C.field(r,"lev_region","delarea").address,"anonymous_18","y2").value,C.field(r,"lev_region","rtype").value,lev);
            break;
            case (C.LR_TELE):
                case (C.LR_UPTELE):
                    case (C.LR_DOWNTELE):
                        /* save the region outlines for goto_level() */
                        if(Number(!!(Number(C.i32(C.field(r,"lev_region","rtype").value)==C.LR_TELE)||Number(C.i32(C.field(r,"lev_region","rtype").value)==C.LR_UPTELE)))) {
                            (C.field(C.field(C.svu,"instance_globals_saved_u","updest").address,"dest_area","lx").value=C.field(C.field(r,"lev_region","inarea").address,"anonymous_17","x1").value);
                            (C.field(C.field(C.svu,"instance_globals_saved_u","updest").address,"dest_area","ly").value=C.field(C.field(r,"lev_region","inarea").address,"anonymous_17","y1").value);
                            (C.field(C.field(C.svu,"instance_globals_saved_u","updest").address,"dest_area","hx").value=C.field(C.field(r,"lev_region","inarea").address,"anonymous_17","x2").value);
                            (C.field(C.field(C.svu,"instance_globals_saved_u","updest").address,"dest_area","hy").value=C.field(C.field(r,"lev_region","inarea").address,"anonymous_17","y2").value);
                            (C.field(C.field(C.svu,"instance_globals_saved_u","updest").address,"dest_area","nlx").value=C.field(C.field(r,"lev_region","delarea").address,"anonymous_18","x1").value);
                            (C.field(C.field(C.svu,"instance_globals_saved_u","updest").address,"dest_area","nly").value=C.field(C.field(r,"lev_region","delarea").address,"anonymous_18","y1").value);
                            (C.field(C.field(C.svu,"instance_globals_saved_u","updest").address,"dest_area","nhx").value=C.field(C.field(r,"lev_region","delarea").address,"anonymous_18","x2").value);
                            (C.field(C.field(C.svu,"instance_globals_saved_u","updest").address,"dest_area","nhy").value=C.field(C.field(r,"lev_region","delarea").address,"anonymous_18","y2").value);
                        }
            if(Number(!!(Number(C.i32(C.field(r,"lev_region","rtype").value)==C.LR_TELE)||Number(C.i32(C.field(r,"lev_region","rtype").value)==C.LR_DOWNTELE)))) {
                (C.field(C.field(C.svd,"instance_globals_saved_d","dndest").address,"dest_area","lx").value=C.field(C.field(r,"lev_region","inarea").address,"anonymous_17","x1").value);
                (C.field(C.field(C.svd,"instance_globals_saved_d","dndest").address,"dest_area","ly").value=C.field(C.field(r,"lev_region","inarea").address,"anonymous_17","y1").value);
                (C.field(C.field(C.svd,"instance_globals_saved_d","dndest").address,"dest_area","hx").value=C.field(C.field(r,"lev_region","inarea").address,"anonymous_17","x2").value);
                (C.field(C.field(C.svd,"instance_globals_saved_d","dndest").address,"dest_area","hy").value=C.field(C.field(r,"lev_region","inarea").address,"anonymous_17","y2").value);
                (C.field(C.field(C.svd,"instance_globals_saved_d","dndest").address,"dest_area","nlx").value=C.field(C.field(r,"lev_region","delarea").address,"anonymous_18","x1").value);
                (C.field(C.field(C.svd,"instance_globals_saved_d","dndest").address,"dest_area","nly").value=C.field(C.field(r,"lev_region","delarea").address,"anonymous_18","y1").value);
                (C.field(C.field(C.svd,"instance_globals_saved_d","dndest").address,"dest_area","nhx").value=C.field(C.field(r,"lev_region","delarea").address,"anonymous_18","x2").value);
                (C.field(C.field(C.svd,"instance_globals_saved_d","dndest").address,"dest_area","nhy").value=C.field(C.field(r,"lev_region","delarea").address,"anonymous_18","y2").value);
            }
            /* place_lregion gets called from goto_level() */
            break;
        }
        if(C.field(C.field(r,"lev_region","rname").address,"str_or_len","str").value) (C.free(C.field(C.field(r,"lev_region","rname").address,"str_or_len","str").value),(C.field(C.field(r,"lev_region","rname").address,"str_or_len","str").value=0));
    }
    /* place dungeon branch if not placed above */
    if(Number(!!(Number(!(added_branch))&&C.Is_branchlev(C.field(C.u,"you","uz").address)))) {
        place_lregion(C.i16(0),C.i16(0),C.i16(0),C.i16(0),C.i16(0),C.i16(0),C.i16(0),C.i16(0),C.i16(C.LR_BRANCH),0);
    }
    /* Still need to add some stuff to level file */
    if(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_medusa_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_medusa_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_medusa_level").address))))))) {
        let otmp;
        let tryct;
        (croom=(C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(0)*C.sizes["struct mkroom"]));
        /* the first room defined on the medusa level */
        for((tryct=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),654,(C.literal("fixup_special"))),C.rnd(4))):C.rnd(4))));tryct;((tryct=C.i32((tryct-1)))+1)) {
            (x=C.somex(croom));
            (y=C.somey(croom));
            if(C.goodpos(C.i16(x),C.i16(y),0,C.u32(0))) {
                let tryct2=0;
                (otmp=C.mk_tt_object(C.STATUE,C.i16(x),C.i16(y)));
                while(Number(!!(Number(!!(Number((tryct2=C.i32((tryct2+1)))<100)&&otmp))&&(Number(!!(C.i32(C.poly_when_stoned((C.mons+Number(C.field(otmp,"obj","corpsenm").value)*C.sizes["struct permonst"])))||(Number((C.i32((C.i32(C.field(((C.mons+Number(C.field(otmp,"obj","corpsenm").value)*C.sizes["struct permonst"])),"permonst","mresists").value)&(128))))!=0)))))))) {
                    /* set_corpsenm() handles weight too */
                    C.set_corpsenm(otmp,C.rndmonnum());
                }
            }
        }
        if(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),671,(C.literal("fixup_special"))),C.rn2(2))):C.rn2(2)))) (otmp=C.mk_tt_object(C.STATUE,C.i16(C.somex(croom)),C.i16(C.somey(croom))));
 else (otmp=C.mkcorpstat(C.STATUE,0,0,C.i16(C.somex(croom)),C.i16(C.somey(croom)),C.u32(0)));
        /* Medusa statues don't contain books */
        if(otmp) {
            (tryct=0);
            while(Number(!!(Number((tryct=C.i32((tryct+1)))<100)&&(Number(!!((Number((C.i32((C.i32(C.field(((C.mons+Number(C.field(otmp,"obj","corpsenm").value)*C.sizes["struct permonst"])),"permonst","mresists").value)&(128))))!=0))||C.i32(C.poly_when_stoned((C.mons+Number(C.field(otmp,"obj","corpsenm").value)*C.sizes["struct permonst"]))))))))) {
                /* set_corpsenm() handles weight too */
                C.set_corpsenm(otmp,C.rndmonnum());
            }
        }
    } else if(Number(!!((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)==(C.PM_CLERIC)))&&C.i32(C.In_quest(C.field(C.u,"you","uz").address))))) {
        /* less chance for undead corpses (lured from lower morgues) */
        (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","graveyard").value=C.u32(1));
    } else if(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_stronghold_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_stronghold_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_stronghold_level").address))))))) {
        (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","graveyard").value=C.u32(1));
    } else if(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_baalzebub_level").address)) {
        /* custom wallify the "beetle" potion of the level */
        baalz_fixup();
    } else if(Number(!!(Number(C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_mines_dnum").value)))&&C.i32(C.field(C.gr,"instance_globals_r","ransacked").value)))) {
        stolen_booty();
    }
    if(Number(!!(Number(((sp=C.Is_special(C.field(C.u,"you","uz").address)))!=0)&&C.i32(C.field(C.field(sp,"s_level","flags").address,"d_flags","town").value)))) (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","has_town").value=C.u32(1));
    /* Mine Town */
    if(C.field(C.gl,"instance_globals_l","lregions").value) (C.free(C.field(C.gl,"instance_globals_l","lregions").value),(C.field(C.gl,"instance_globals_l","lregions").value=0));
    (C.field(C.gn,"instance_globals_n","num_lregions").value=0);
    } finally {C.stackRestore(stackFrame); }
}

export function check_ransacked(s)
{
    s=C.ptr(s);
    /* this kludge only works as long as orctown is minetn-1 */
    (C.field(C.gr,"instance_globals_r","ransacked").value=C.i8((Number(!!(Number(C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_mines_dnum").value)))&&Number(!(C.strcmp(s,C.literal("minetn-1")))))))));
}

export function migrate_orc(mtmp,mflags)
{
    mtmp=C.ptr(mtmp);
    mflags=C.u64(mflags);
    const stackFrame=C.stackSave();
    try {
    let nlev; let max_depth; let cur_depth;
    let dest=C.stackAlloc(C.sizes["struct d_level"]);
    (cur_depth=C.i32(C.depth(C.field(C.u,"you","uz").address)));
    (max_depth=C.i32((C.i32(C.dunlevs_in_dungeon(C.field(C.u,"you","uz").address))+(C.i32((C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value)*C.sizes["struct dungeon"]),"dungeon","depth_start").value-1))))));
    if(Number(mflags==C.u64(1))) {
        /* Note that the orc leader will take possession of any
         * remaining stuff not already delivered to other
         * orcs between here and the bottom of the mines.
         */
        (nlev=max_depth);
        /* once in a blue moon, he won't be at the very bottom */
        if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),732,(C.literal("migrate_orc"))),C.rn2(40))):C.rn2(40)))))) ((nlev=C.i32((nlev-1)))+1);
        (C.field(mtmp,"monst","migflags").value=C.i64(C.field(mtmp,"monst","migflags").value|C.i64(8192)));
    } else {
        (nlev=C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),736,(C.literal("migrate_orc"))),C.rn2(C.i32(((C.i32((max_depth-cur_depth)))+1))))):C.rn2(C.i32(((C.i32((max_depth-cur_depth)))+1)))))+cur_depth)));
        if(Number(nlev==cur_depth)) ((nlev=C.i32((nlev+1)))-1);
        if(Number(nlev>max_depth)) (nlev=max_depth);
        (C.field(mtmp,"monst","migflags").value=(C.i64((C.field(mtmp,"monst","migflags").value&C.i64(C.i32((~8192)))))));
    }
    C.get_level(dest,nlev);
    C.migrate_to_level(mtmp,C.ledger_no(dest),C.i16(0),0);
    } finally {C.stackRestore(stackFrame); }
}

export function shiny_orc_stuff(mtmp)
{
    mtmp=C.ptr(mtmp);
    let gemprob; let goldprob; let otyp;
    let otmp;
    let is_captain=C.i8((Number(C.field(mtmp,"monst","data").value==(C.mons+Number(C.PM_ORC_CAPTAIN)*C.sizes["struct permonst"]))));
    /* probabilities */
    (goldprob=(C.i32(is_captain)?600:300));
    (gemprob=C.i32(Math.trunc((goldprob/4))));
    if(Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),757,(C.literal("shiny_orc_stuff"))),C.rn2(1000))):C.rn2(1000)))<goldprob)) {
        if(Number(((otmp=C.mksobj(C.GOLD_PIECE,(C.i8(1)),(C.i8(0)))))!=0)) {
            (C.field(otmp,"obj","quan").value=C.i64((1n+C.i64(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),759,(C.literal("shiny_orc_stuff"))),C.rnd(goldprob))):C.rnd(goldprob)))))));
            (C.field(otmp,"obj","owt").value=C.u32(C.weight(otmp)));
            C.add_to_minv(mtmp,otmp);
        }
    }
    if(Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),764,(C.literal("shiny_orc_stuff"))),C.rn2(1000))):C.rn2(1000)))<gemprob)) {
        if(Number(((otmp=C.mkobj(C.GEM_CLASS,(C.i8(0)))))!=0)) {
            if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.ROCK)) C.dealloc_obj(otmp);
 else C.add_to_minv(mtmp,otmp);
        }
    }
    if(Number(!!(C.i32(is_captain)||Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),772,(C.literal("shiny_orc_stuff"))),C.rn2(8))):C.rn2(8)))))))) {
        (otyp=C.shiny_obj(C.i8(C.RING_CLASS)));
        if(Number(!!(Number(otyp!=C.STRANGE_OBJECT)&&Number(((otmp=C.mksobj(otyp,(C.i8(1)),(C.i8(0)))))!=0)))) C.add_to_minv(mtmp,otmp);
    }
}

export function migr_booty_item(otyp,gang)
{
    otyp=C.i32(otyp);
    gang=C.ptr(gang);
    let otmp;
    (otmp=C.mksobj_migr_to_species(otyp,C.u32(C.u64(128n)),(C.i8(1)),(C.i8(0))));
    if(Number(!!(otmp&&gang))) {
        C.new_oname(otmp,C.i32(C.u32((C.Strlen_(gang,(C.literal("migr_booty_item")),786)+C.u32(1)))));
        /* removes old name if present */
        C.strcpy((C.field(C.field((otmp),"obj","oextra").value,"oextra","oname").value),gang);
        if(Number(C.i32(C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_class").value)==C.FOOD_CLASS)) {
            if(Number(otyp==C.SLIME_MOLD)) (C.field(otmp,"obj","spe").value=C.i8(C.fruitadd(C.cell((C.staticAddress("orcfruit")+Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),790,(C.literal("migr_booty_item"))),C.rn2(C.i32((C.u64((BigInt((8*2))/BigInt(8)))))))):C.rn2(C.i32((C.u64((BigInt((8*2))/BigInt(8)))))))))*8),"char *").value,0)));
            (C.field(otmp,"obj","quan").value=C.i64(C.field(otmp,"obj","quan").value+C.i64(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),792,(C.literal("migr_booty_item"))),C.rn2(3))):C.rn2(3))))));
            (C.field(otmp,"obj","owt").value=C.u32(C.weight(otmp)));
        }
    }
}

export function stolen_booty()
{
    const stackFrame=C.stackSave();
    try {
    let gang; let gang_name=C.stackAlloc((1*256));
    let mtmp;
    let cnt; let i; let otyp;
    /*
     * --------------------------------------------------------
     * Mythos:
     *
     *      A tragic accident has occurred in Frontier Town...
     *      It has been overrun by orcs.
     *
     *      The booty that the orcs took from the town is now
     *      in the possession of the orcs that did this and
     *      have long since fled the level.
     * --------------------------------------------------------
     */
    (gang=C.rndorcname(gang_name));
    /* create the stuff that the gang took */
    (cnt=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),820,(C.literal("stolen_booty"))),C.rnd(4))):C.rnd(4))));
    for((i=0);Number(i<cnt);(i=C.i32((i+1)))) migr_booty_item((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),822,(C.literal("stolen_booty"))),C.rn2(4))):C.rn2(4)))?C.TALLOW_CANDLE:C.WAX_CANDLE),gang);

    (cnt=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),823,(C.literal("stolen_booty"))),C.rnd(3))):C.rnd(3))));
    for((i=0);Number(i<cnt);(i=C.i32((i+1)))) migr_booty_item(C.SKELETON_KEY,gang);

    (otyp=(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),826,(C.literal("stolen_booty"))),C.rn2(C.i32(((C.i32((C.GAUNTLETS_OF_DEXTERITY-C.LEATHER_GLOVES)))+1))))):C.rn2(C.i32(((C.i32((C.GAUNTLETS_OF_DEXTERITY-C.LEATHER_GLOVES)))+1)))))+(C.LEATHER_GLOVES)))));
    migr_booty_item(otyp,gang);
    (cnt=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),828,(C.literal("stolen_booty"))),C.rnd(10))):C.rnd(10))));
    for((i=0);Number(i<cnt);(i=C.i32((i+1)))) {
        /* Food items - but no lembas! (or some other weird things) */
        (otyp=(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),831,(C.literal("stolen_booty"))),C.rn2(C.i32((C.i32((C.TIN-C.TRIPE_RATION))+1))))):C.rn2(C.i32((C.i32((C.TIN-C.TRIPE_RATION))+1)))))+(C.TRIPE_RATION)))));
        if(Number(!!(Number(!!(Number(!!(Number(!!(Number(otyp!=C.LEMBAS_WAFER)&&(Number(!!(Number(!!(Number(C.i32(C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_prob").value)!=0)||Number(otyp==C.C_RATION)))||Number(otyp==C.K_RATION))))))&&Number(otyp!=C.CORPSE)))&&Number(otyp!=C.EGG)))&&Number(otyp!=C.TIN)))) migr_booty_item(otyp,gang);
        /* exclude meat <anything>, globs of <anything>, kelp
               which all have random generation probability of 0
               (K-/C-rations do too, but we want to include those) */
        /* exclude food items which utilize obj->corpsenm because
               that field is going to be overloaded for delivery purposes */
    }
    migr_booty_item((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),843,(C.literal("stolen_booty"))),C.rn2(2))):C.rn2(2)))?C.LONG_SWORD:C.SILVER_SABER),gang);
    /* create the leader of the orc gang */
    (mtmp=C.makemon((C.mons+Number(C.PM_ORC_CAPTAIN)*C.sizes["struct permonst"]),C.i16(0),C.i16(0),C.u32(64n)));
    if(mtmp) {
        (mtmp=C.christen_monst(mtmp,C.upstart(gang)));
        (C.field(mtmp,"monst","mpeaceful").value=C.u32(0));
        C.set_malign(mtmp);
        shiny_orc_stuff(mtmp);
        migrate_orc(mtmp,C.u64(1));
    }
    /* Make most of the orcs on the level be part of the invading gang */
    for((mtmp=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value);mtmp;(mtmp=C.field(mtmp,"monst","nmon").value)) {
        if((Number(C.field((mtmp),"monst","mhp").value<1))) continue;
        if(Number(!!(Number(!!((Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags2").value&C.u64(128n))))!=C.u64(0n)))&&Number(!((Number(!!(C.field((mtmp),"monst","mextra").value&&(C.field(C.field((mtmp),"monst","mextra").value,"mextra","mgivenname").value))))))))&&((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),858,(C.literal("stolen_booty"))),C.rn2(10))):C.rn2(10)))))) {
            /*
             * We'll consider the orc captain from the level
             * description to be the captain of a rival orc horde
             * who is there to see what has transpired, and to
             * contemplate future action.
             *
             * Don't christen the orc captain as a subordinate
             * member of the main orc horde.
             */
            if(Number(C.field(mtmp,"monst","data").value!=(C.mons+Number(C.PM_ORC_CAPTAIN)*C.sizes["struct permonst"]))) (mtmp=C.christen_orc(mtmp,C.upstart(gang),C.literal("")));
        }
    }
    /* Lastly, ensure there's several more orcs from the gang along the way.
     * The mechanics are such that they aren't actually identified as
     * members of the invading gang until they get their spoils assigned
     * to the inventory; handled during that assignment.
     */
    (cnt=C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),877,(C.literal("stolen_booty"))),C.rn2(10))):C.rn2(10)))+5)));
    for((i=0);Number(i<cnt);(i=C.i32((i+1)))) {
        let mtyp;
        (mtyp=C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),881,(C.literal("stolen_booty"))),C.rn2(C.i32(((C.i32((C.PM_ORC_SHAMAN-C.PM_ORC)))+1))))):C.rn2(C.i32(((C.i32((C.PM_ORC_SHAMAN-C.PM_ORC)))+1)))))+C.PM_ORC)));
        (mtmp=C.makemon((C.mons+Number(mtyp)*C.sizes["struct permonst"]),C.i16(0),C.i16(0),C.u32(64n)));
        if(mtmp) {
            shiny_orc_stuff(mtmp);
            migrate_orc(mtmp,0n);
        }
    }
    (C.field(C.gr,"instance_globals_r","ransacked").value=C.i8(0));
    } finally {C.stackRestore(stackFrame); }
}

export function maze_inbounds(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    return C.i8((Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(x)>=2)&&Number(C.i32(y)>=2)))&&Number(C.i32(x)<C.field(C.gx,"instance_globals_x","x_maze_max").value)))&&Number(C.i32(y)<C.field(C.gy,"instance_globals_y","y_maze_max").value)))&&C.isok(x,y)))));
    /* isok() test is superfluous here (unless something has
               clobbered the static *_maze_max variables) */
}

export function maze_remove_deadends(typ)
{
    typ=C.i16(typ);
    const stackFrame=C.stackSave();
    try {
    let dirok=C.stackAlloc((1*4));
    let x; let y; let dir; let idx; let idx2; let dx; let dy; let dx2; let dy2;
    (C.cell((dirok+Number(0)*1),"char").value=C.i8(0));
    /* lint suppression */
    for((x=C.i16(2));Number(C.i32(x)<C.field(C.gx,"instance_globals_x","x_maze_max").value);((x=C.i16((x+1)))-1)) for((y=C.i16(2));Number(C.i32(y)<C.field(C.gy,"instance_globals_y","y_maze_max").value);((y=C.i16((y+1)))-1)) if(Number(!!(Number(!!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))>=C.DOOR))&&(C.i32((C.i32(x)%2)))))&&(C.i32((C.i32(y)%2)))))) {
        (idx=(idx2=C.i16(0)));
        for((dir=C.i16(0));Number(C.i32(dir)<4);((dir=C.i16((dir+1)))-1)) {
            /* note: mz_move() is a macro which modifies
                       one of its first two parameters */
            (dx=(dx2=x));
            (dy=(dy2=y));
            do {
                switch(C.i32(dir)) {
                    case (0):
                        ((dy)=C.i16(((dy)-1)));
                    break;
                    case (1):
                        (((dx)=C.i16(((dx)+1)))-1);
                    break;
                    case (2):
                        (((dy)=C.i16(((dy)+1)))-1);
                    break;
                    case (3):
                        ((dx)=C.i16(((dx)-1)));
                    break;
                    default:
                        C.variadic(5,C.literal("mz_move: bad direction %d"),C.i32(dir));
                }
            } while(0);
            if(Number(!(maze_inbounds(dx,dy)))) {
                ((idx2=C.i16((idx2+1)))-1);
                continue;
            }
            do {
                switch(C.i32(dir)) {
                    case (0):
                        ((dy2)=C.i16(((dy2)-1)));
                    break;
                    case (1):
                        (((dx2)=C.i16(((dx2)+1)))-1);
                    break;
                    case (2):
                        (((dy2)=C.i16(((dy2)+1)))-1);
                    break;
                    case (3):
                        ((dx2)=C.i16(((dx2)-1)));
                    break;
                    default:
                        C.variadic(6,C.literal("mz_move: bad direction %d"),C.i32(dir));
                }
            } while(0);
            do {
                switch(C.i32(dir)) {
                    case (0):
                        ((dy2)=C.i16(((dy2)-1)));
                    break;
                    case (1):
                        (((dx2)=C.i16(((dx2)+1)))-1);
                    break;
                    case (2):
                        (((dy2)=C.i16(((dy2)+1)))-1);
                    break;
                    case (3):
                        ((dx2)=C.i16(((dx2)-1)));
                    break;
                    default:
                        C.variadic(7,C.literal("mz_move: bad direction %d"),C.i32(dir));
                }
            } while(0);
            if(Number(!(maze_inbounds(dx2,dy2)))) {
                ((idx2=C.i16((idx2+1)))-1);
                continue;
            }
            if(Number(!!(Number(!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(dx)*(C.sizes["struct rm"]*21))+Number(dy)*C.sizes["struct rm"]),"rm","typ").value))>=C.DOOR))))&&(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(dx2)*(C.sizes["struct rm"]*21))+Number(dy2)*C.sizes["struct rm"]),"rm","typ").value))>=C.DOOR))))) {
                (C.cell((dirok+Number(((idx=C.i16((idx+1)))-1))*1),"char").value=C.i8(dir));
                ((idx2=C.i16((idx2+1)))-1);
            }
        }
        if(Number(!!(Number(C.i32(idx2)>=3)&&Number(C.i32(idx)>0)))) {
            (dx=x);
            (dy=y);
            (dir=C.i16(C.cell((dirok+Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),939,(C.literal("maze_remove_deadends"))),C.rn2(C.i32(idx)))):C.rn2(C.i32(idx)))))*1),"char").value));
            do {
                switch(C.i32(dir)) {
                    case (0):
                        ((dy)=C.i16(((dy)-1)));
                    break;
                    case (1):
                        (((dx)=C.i16(((dx)+1)))-1);
                    break;
                    case (2):
                        (((dy)=C.i16(((dy)+1)))-1);
                    break;
                    case (3):
                        ((dx)=C.i16(((dx)-1)));
                    break;
                    default:
                        C.variadic(8,C.literal("mz_move: bad direction %d"),C.i32(dir));
                }
            } while(0);
            (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(dx)*(C.sizes["struct rm"]*21))+Number(dy)*C.sizes["struct rm"]),"rm","typ").value=C.i8(typ));
        }
    }


    } finally {C.stackRestore(stackFrame); }
}

/* Create a maze with specified corridor width and wall thickness
 * TODO: rewrite walkfrom so it works on temp space, not levl
 */
export function create_maze(corrwid,wallthick,rmdeadends)
{
    corrwid=C.i32(corrwid);
    wallthick=C.i32(wallthick);
    rmdeadends=C.i8(rmdeadends);
    const stackFrame=C.stackSave();
    try {
    let x; let y;
    let mm=C.stackAlloc(C.sizes["struct nhcoord"]);
    let tmp_xmax=C.field(C.gx,"instance_globals_x","x_maze_max").value;
    let tmp_ymax=C.field(C.gy,"instance_globals_y","y_maze_max").value;
    let rdx=0;
    let rdy=0;
    let scale;
    if(Number(corrwid==C.i32((-1)))) (corrwid=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),961,(C.literal("create_maze"))),C.rnd(4))):C.rnd(4))));
    if(Number(wallthick==C.i32((-1)))) (wallthick=C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),964,(C.literal("create_maze"))),C.rnd(4))):C.rnd(4)))-corrwid)));
    if(Number(wallthick<1)) (wallthick=1);
 else if(Number(wallthick>5)) (wallthick=5);
    if(Number(corrwid<1)) (corrwid=1);
 else if(Number(corrwid>5)) (corrwid=5);
    (scale=C.i32((corrwid+wallthick)));
    (rdx=(C.i32(Math.trunc((C.field(C.gx,"instance_globals_x","x_maze_max").value/scale)))));
    (rdy=(C.i32(Math.trunc((C.field(C.gy,"instance_globals_y","y_maze_max").value/scale)))));
    if(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","corrmaze").value) for((x=C.i16(2));Number(C.i32(x)<(C.i32((rdx*2))));((x=C.i16((x+1)))-1)) for((y=C.i16(2));Number(C.i32(y)<(C.i32((rdy*2))));((y=C.i16((y+1)))-1)) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value=C.i8(C.STONE));


 else for((x=C.i16(2));Number(C.i32(x)<=(C.i32((rdx*2))));((x=C.i16((x+1)))-1)) for((y=C.i16(2));Number(C.i32(y)<=(C.i32((rdy*2))));((y=C.i16((y+1)))-1)) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value=C.i8(((Number(!!((C.i32((C.i32(x)%2)))&&(C.i32((C.i32(y)%2))))))?C.STONE:C.HWALL)));


    /* set upper bounds for maze0xy and walkfrom */
    (C.field(C.gx,"instance_globals_x","x_maze_max").value=(C.i32((rdx*2))));
    (C.field(C.gy,"instance_globals_y","y_maze_max").value=(C.i32((rdy*2))));
    /* create maze */
    maze0xy(mm);
    walkfrom(C.i16(C.i32(C.field(mm,"nhcoord","x").value)),C.i16(C.i32(C.field(mm,"nhcoord","y").value)),C.i8(0));
    if(rmdeadends) maze_remove_deadends(C.i16((C.i32((C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","corrmaze").value))?C.CORR:C.ROOM)));
    /* restore bounds */
    (C.field(C.gx,"instance_globals_x","x_maze_max").value=tmp_xmax);
    (C.field(C.gy,"instance_globals_y","y_maze_max").value=tmp_ymax);
    /* scale maze up if needed */
    if(Number(scale>2)) {
        let tmpmap=C.stackAlloc(((1*80)*21));
        let mx; let my; let dx; let dy; let rx=1; let ry=1;
        /* back up the existing smaller maze */
        for((x=C.i16(1));Number(C.i32(x)<C.field(C.gx,"instance_globals_x","x_maze_max").value);((x=C.i16((x+1)))-1)) for((y=C.i16(1));Number(C.i32(y)<C.field(C.gy,"instance_globals_y","y_maze_max").value);((y=C.i16((y+1)))-1)) {
            (C.cell(((tmpmap+Number(x)*(1*21))+Number(y)*1),"char").value=C.i8(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value));
        }

        /* do the scaling */
        (rx=C.i32((x=C.i16(2))));
        while(Number(rx<C.field(C.gx,"instance_globals_x","x_maze_max").value)) {
            (mx=((C.i32((C.i32(x)%2)))?corrwid:((Number(!!(Number(C.i32(x)==2)||Number(C.i32(x)==C.i32((rdx*2))))))?1:wallthick)));
            (ry=C.i32((y=C.i16(2))));
            while(Number(ry<C.field(C.gy,"instance_globals_y","y_maze_max").value)) {
                (my=((C.i32((C.i32(y)%2)))?corrwid:((Number(!!(Number(C.i32(y)==2)||Number(C.i32(y)==C.i32((rdy*2))))))?1:wallthick)));
                for((dx=0);Number(dx<mx);((dx=C.i32((dx+1)))-1)) for((dy=0);Number(dy<my);((dy=C.i32((dy+1)))-1)) {
                    if(Number(!!(Number(C.i32((rx+dx))>=C.field(C.gx,"instance_globals_x","x_maze_max").value)||Number(C.i32((ry+dy))>=C.field(C.gy,"instance_globals_y","y_maze_max").value)))) break;
                    (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((rx+dx)))*(C.sizes["struct rm"]*21))+Number(C.i32((ry+dy)))*C.sizes["struct rm"]),"rm","typ").value=C.i8(C.cell(((tmpmap+Number(x)*(1*21))+Number(y)*1),"char").value));
                }

                (ry=C.i32(ry+my));
                ((y=C.i16((y+1)))-1);
            }
            (rx=C.i32(rx+mx));
            ((x=C.i16((x+1)))-1);
        }
    }
    } finally {C.stackRestore(stackFrame); }
}

export function pick_vibrasquare_location()
{
    let x; let y;
    let stway;
    let trycnt=0;
    /* these are also defined in mklev.c and they may not be appropriate
       for mazes with corridors wider than 1 or for cavernous levels */
    /*
     * Pick a position where the stairs down to Moloch's Sanctum
     * level will ultimately be created.  At that time, an area
     * will be altered:  walls removed, moat and traps generated,
     * boulders destroyed.  The position picked here must ensure
     * that that invocation area won't extend off the map.
     *
     * We actually allow up to 2 squares around the usual edge of
     * the area to get truncated; see mkinvokearea(mklev.c).
     */
    let x_range=C.i32((C.i32((C.i32((C.field(C.gx,"instance_globals_x","x_maze_max").value-2))-C.i32((2*(C.i32((6-2)))))))-1)); let y_range=C.i32((C.i32((C.i32((C.field(C.gy,"instance_globals_y","y_maze_max").value-2))-C.i32((2*(C.i32((5-2)))))))-1));
    if(Number(!!(Number(!!(Number(x_range<=(C.i32((6-2))))||Number(y_range<=(C.i32((5-2))))))||Number((C.i32((x_range*y_range)))<=(C.i32((11*11))))))) {
        do {
            if(C.debugcore(C.literal("mkmaze.c"),(C.i8(1)))) {
                let save_plnmsg=C.field(C.iflags,"instance_flags","last_msg").value;
                C.variadic(9,C.literal("svi.inv_pos: maze is too small! (%d x %d)"),C.field(C.gx,"instance_globals_x","x_maze_max").value,C.field(C.gy,"instance_globals_y","y_maze_max").value);
                (C.field(C.iflags,"instance_flags","last_msg").value=save_plnmsg);
            }
        } while(0);
    }
    (C.field(C.field(C.svi,"instance_globals_saved_i","inv_pos").address,"nhcoord","x").value=(C.field(C.field(C.svi,"instance_globals_saved_i","inv_pos").address,"nhcoord","y").value=C.i16(0)));
    /*{occupied() => invocation_pos()}*/
    do {
        (x=C.i16((C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1075,(C.literal("pick_vibrasquare_location"))),C.rn2(x_range))):C.rn2(x_range)))+(C.i32((C.i32((2+(C.i32((6-2)))))+1))))))));
        (y=C.i16((C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1076,(C.literal("pick_vibrasquare_location"))),C.rn2(y_range))):C.rn2(y_range)))+(C.i32((C.i32((2+(C.i32((5-2)))))+1))))))));
        /* we don't want it to be too near the stairs, nor
           to be on a spot that's already in use (wall|trap) */
        if(Number((trycnt=C.i32((trycnt+1)))>1000)) break;
    } while(Number(!!((Number(((stway=C.stairway_find_dir((C.i8(1)))))!=0))&&(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(x)==C.i32(C.field(stway,"stairway","sx").value))||Number(C.i32(y)==C.i32(C.field(stway,"stairway","sy").value))))||Number(C.abs(C.i32((C.i32(x)-C.i32(C.field(stway,"stairway","sx").value))))==C.abs(C.i32((C.i32(y)-C.i32(C.field(stway,"stairway","sy").value)))))))||Number(C.distmin(x,y,C.field(stway,"stairway","sx").value,C.field(stway,"stairway","sy").value)<=11)))||Number(!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))>C.DOOR))))))||C.i32(C.occupied(x,y))))))));
    /*(direct line)*/
    (C.field(C.field(C.svi,"instance_globals_saved_i","inv_pos").address,"nhcoord","x").value=x);
    (C.field(C.field(C.svi,"instance_globals_saved_i","inv_pos").address,"nhcoord","y").value=y);
}

/* add objects and monsters to random maze */
export function populate_maze()
{
    const stackFrame=C.stackSave();
    try {
    let i;
    let mm=C.stackAlloc(C.sizes["struct nhcoord"]);
    for((i=(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1102,(C.literal("populate_maze"))),C.rn2(8))):C.rn2(8)))+(11)))));i;((i=C.i32((i-1)))+1)) {
        mazexy(mm);
        C.mkobj_at(C.i8((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1104,(C.literal("populate_maze"))),C.rn2(2))):C.rn2(2)))?C.GEM_CLASS:C.RANDOM_CLASS)),C.field(mm,"nhcoord","x").value,C.field(mm,"nhcoord","y").value,(C.i8(1)));
    }
    for((i=(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1106,(C.literal("populate_maze"))),C.rn2(10))):C.rn2(10)))+(2)))));i;((i=C.i32((i-1)))+1)) {
        mazexy(mm);
        C.mksobj_at(C.BOULDER,C.field(mm,"nhcoord","x").value,C.field(mm,"nhcoord","y").value,(C.i8(1)),(C.i8(0)));
    }
    for((i=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1110,(C.literal("populate_maze"))),C.rn2(3))):C.rn2(3))));i;((i=C.i32((i-1)))+1)) {
        mazexy(mm);
        C.makemon((C.mons+Number(C.PM_MINOTAUR)*C.sizes["struct permonst"]),C.field(mm,"nhcoord","x").value,C.field(mm,"nhcoord","y").value,C.u32(0n));
    }
    for((i=(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1114,(C.literal("populate_maze"))),C.rn2(5))):C.rn2(5)))+(7)))));i;((i=C.i32((i-1)))+1)) {
        mazexy(mm);
        C.makemon(0,C.field(mm,"nhcoord","x").value,C.field(mm,"nhcoord","y").value,C.u32(0n));
    }
    for((i=(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1118,(C.literal("populate_maze"))),C.rn2(6))):C.rn2(6)))+(7)))));i;((i=C.i32((i-1)))+1)) {
        mazexy(mm);
        C.mkgold(0n,C.field(mm,"nhcoord","x").value,C.field(mm,"nhcoord","y").value);
    }
    for((i=(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1122,(C.literal("populate_maze"))),C.rn2(6))):C.rn2(6)))+(7)))));i;((i=C.i32((i-1)))+1)) C.mktrap(0,2,0,0);

    } finally {C.stackRestore(stackFrame); }
}

export function makemaz(s)
{
    s=C.ptr(s);
    const stackFrame=C.stackSave();
    try {
    let protofile=C.stackAlloc((1*20));
    let sp=C.Is_special(C.field(C.u,"you","uz").address);
    let mm=C.stackAlloc(C.sizes["struct nhcoord"]);
    if(C.cell(s,"char").value) {
        if(Number(!!(sp&&C.i32(C.field(sp,"s_level","rndlevs").value)))) C.variadic(10,(C.literal("makemaz")),1136,protofile,BigInt((1*20)),C.literal("%s-%d"),s,((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1136,(C.literal("makemaz"))),C.rnd(C.i32(C.field(sp,"s_level","rndlevs").value)))):C.rnd(C.i32(C.field(sp,"s_level","rndlevs").value)))));
 else C.strcpy(protofile,s);
    } else if(C.cell((C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value)*C.sizes["struct dungeon"]),"dungeon","proto").address),"char").value) {
        if(Number(C.i32(C.dunlevs_in_dungeon(C.field(C.u,"you","uz").address))>1)) {
            if(Number(!!(sp&&C.i32(C.field(sp,"s_level","rndlevs").value)))) C.variadic(11,(C.literal("makemaz")),1144,protofile,BigInt((1*20)),C.literal("%s%d-%d"),C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value)*C.sizes["struct dungeon"]),"dungeon","proto").address,C.i32(C.dunlev(C.field(C.u,"you","uz").address)),((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1144,(C.literal("makemaz"))),C.rnd(C.i32(C.field(sp,"s_level","rndlevs").value)))):C.rnd(C.i32(C.field(sp,"s_level","rndlevs").value)))));
 else C.variadic(12,(C.literal("makemaz")),1148,protofile,BigInt((1*20)),C.literal("%s%d"),C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value)*C.sizes["struct dungeon"]),"dungeon","proto").address,C.i32(C.dunlev(C.field(C.u,"you","uz").address)));
        } else if(Number(!!(sp&&C.i32(C.field(sp,"s_level","rndlevs").value)))) {
            C.variadic(13,(C.literal("makemaz")),1152,protofile,BigInt((1*20)),C.literal("%s-%d"),C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value)*C.sizes["struct dungeon"]),"dungeon","proto").address,((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1152,(C.literal("makemaz"))),C.rnd(C.i32(C.field(sp,"s_level","rndlevs").value)))):C.rnd(C.i32(C.field(sp,"s_level","rndlevs").value)))));
        } else C.strcpy(protofile,C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value)*C.sizes["struct dungeon"]),"dungeon","proto").address);
    } else C.strcpy(protofile,C.literal(""));
    /* SPLEVTYPE format is "level-choice,level-choice"... */
    if(Number(!!(Number(!!(Number(!!(C.i32(C.field(C.flags,"flag","debug").value)&&C.i32(C.cell(protofile,"char").value)))&&sp))&&C.i32(C.field(sp,"s_level","rndlevs").value)))) {
        let ep=C.getenv(C.literal("SPLEVTYPE"));
        /* not nh_getenv */
        if(ep) {
            /* strrchr always succeeds due to code in prior block */
            let len=C.i32((C.i64(((C.i64(((C.strrchr(protofile,45)-protofile)/1)))+C.i64(1)))));
            while(Number(!!(ep&&C.i32(C.cell(ep,"char").value)))) {
                if(Number(!(C.strncmp(ep,protofile,C.u64(len))))) {
                    let pick=C.atoi((ep+Number(len)*1));
                    /* use choice only if valid */
                    if(Number(!!(Number(pick>0)&&Number(pick<=C.i32(C.field(sp,"s_level","rndlevs").value))))) C.variadic(14,(protofile+Number(len)*1),C.literal("%d"),pick);
                    break;
                } else {
                    (ep=C.strchr(ep,44));
                    if(ep) (ep=C.ptr((ep+Number(1))));
                }
            }
        }
    }
    if(C.cell(protofile,"char").value) {
        check_ransacked(protofile);
        C.strcat(protofile,C.literal(".lua"));
        (C.field(C.gi,"instance_globals_i","in_mk_themerooms").value=(C.i8(0)));
        if(C.load_special(protofile)) {
            /* some levels can end up with monsters
               on dead mon list, including light source monsters */
            C.dmonsfree();
            return;
            /* no mazification right now */
        }
        C.variadic(15,C.literal("Couldn't load \"%s\" - making a maze."),protofile);
    }
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","is_maze_lev").value=C.u32(1));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","corrmaze").value=C.u32(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1198,(C.literal("makemaz"))),C.rn2(3))):C.rn2(3)))))));
    if(Number(!!(Number(!(C.Invocation_lev(C.field(C.u,"you","uz").address)))&&((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1200,(C.literal("makemaz"))),C.rn2(2))):C.rn2(2)))))) {
        create_maze(C.i32((-1)),C.i32((-1)),C.i8(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1201,(C.literal("makemaz"))),C.rn2(5))):C.rn2(5)))))));
    } else {
        create_maze(1,1,(C.i8(0)));
    }
    if(Number(!(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","corrmaze").value))) wallification(C.i16(2),C.i16(2),C.i16(C.field(C.gx,"instance_globals_x","x_maze_max").value),C.i16(C.field(C.gy,"instance_globals_y","y_maze_max").value));
    mazexy(mm);
    C.mkstairs(C.field(mm,"nhcoord","x").value,C.field(mm,"nhcoord","y").value,C.i8(1),0,(C.i8(0)));
    /* up */
    if(Number(!(C.Invocation_lev(C.field(C.u,"you","uz").address)))) {
        mazexy(mm);
        C.mkstairs(C.field(mm,"nhcoord","x").value,C.field(mm,"nhcoord","y").value,C.i8(0),0,(C.i8(0)));
        /* down */
    } else {
        /* choose "vibrating square" location */
        pick_vibrasquare_location();
        C.maketrap(C.field(C.field(C.svi,"instance_globals_saved_i","inv_pos").address,"nhcoord","x").value,C.field(C.field(C.svi,"instance_globals_saved_i","inv_pos").address,"nhcoord","y").value,C.VIBRATING_SQUARE);
    }
    /* place branch stair or portal */
    C.place_branch(C.Is_branchlev(C.field(C.u,"you","uz").address),C.i16(0),C.i16(0));
    populate_maze();
    } finally {C.stackRestore(stackFrame); }
}

/* Make the mazewalk iterative by faking a stack.  This is needed to
 * ensure the mazewalk is successful in the limited stack space of
 * the program.  This iterative version uses the minimum amount of stack
 * that is totally safe.
 */
/* a maze cell is 4 squares */
/* char's are OK */
/* might still be on edge of MAP, so don't overwrite */
/* !MICRO */
export function walkfrom(x,y,typ)
{
    x=C.i16(x);
    y=C.i16(y);
    typ=C.i8(typ);
    const stackFrame=C.stackSave();
    try {
    let q; let a; let dir;
    let dirs=C.stackAlloc((4*4));
    if(Number(!(typ))) {
        if(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","corrmaze").value) (typ=C.i8(C.CORR));
 else (typ=C.i8(C.ROOM));
    }
    if(Number(!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))==C.DOOR))))) {
        /* might still be on edge of MAP, so don't overwrite */
        (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value=typ);
        (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value=C.u32(0));
    }
    while(1) {
        (q=0);
        for((a=0);Number(a<4);((a=C.i32((a+1)))-1)) if(okay(x,y,C.i16(a))) (C.cell((dirs+Number(((q=C.i32((q+1)))-1))*4),"int").value=a);

        if(Number(!(q))) return;
        (dir=C.cell((dirs+Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1304,(C.literal("walkfrom"))),C.rn2(q))):C.rn2(q))))*4),"int").value);
        do {
            switch(dir) {
                case (0):
                    ((y)=C.i16(((y)-1)));
                break;
                case (1):
                    (((x)=C.i16(((x)+1)))-1);
                break;
                case (2):
                    (((y)=C.i16(((y)+1)))-1);
                break;
                case (3):
                    ((x)=C.i16(((x)-1)));
                break;
                default:
                    C.variadic(16,C.literal("mz_move: bad direction %d"),dir);
            }
        } while(0);
        (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value=typ);
        do {
            switch(dir) {
                case (0):
                    ((y)=C.i16(((y)-1)));
                break;
                case (1):
                    (((x)=C.i16(((x)+1)))-1);
                break;
                case (2):
                    (((y)=C.i16(((y)+1)))-1);
                break;
                case (3):
                    ((x)=C.i16(((x)-1)));
                break;
                default:
                    C.variadic(17,C.literal("mz_move: bad direction %d"),dir);
            }
        } while(0);
        walkfrom(x,y,typ);
    }
    } finally {C.stackRestore(stackFrame); }
}

/* ?MICRO */
/* find random point in generated corridors,
   so we don't create items in moats, bunkers, or walls */
export function mazexy(cc)
{
    cc=C.ptr(cc);
    let x; let y;
    let allowedtyp=((C.i32(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","corrmaze").value)?C.CORR:C.ROOM));
    let cpt=0;
    do {
        /* once upon a time this only considered odd values greater than 2
           and less than N (for N=={x,y}_maze_max) because even values were
           where maze walls always got placed; when wider maze corridors
           were introduced it was changed to 1+rn2(N) which is just an
           obscure way to get rnd(N); probably ought to be using 2+rn2(N-1)
           to exclude the maze's outer boundary walls; trying and rejecting
           those walls will waste some of the 100 random attempts... */
        (x=C.i16(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1330,(C.literal("mazexy"))),C.rnd(C.field(C.gx,"instance_globals_x","x_maze_max").value))):C.rnd(C.field(C.gx,"instance_globals_x","x_maze_max").value)))));
        (y=C.i16(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1331,(C.literal("mazexy"))),C.rnd(C.field(C.gy,"instance_globals_y","y_maze_max").value))):C.rnd(C.field(C.gy,"instance_globals_y","y_maze_max").value)))));
        if(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==allowedtyp)) {
            (C.field(cc,"nhcoord","x").value=x);
            (C.field(cc,"nhcoord","y").value=y);
            return;
        }
    } while(Number((cpt=C.i32((cpt+1)))<100));
    /* 100 random attempts failed; systematically try every possibility */
    for((x=C.i16(1));Number(C.i32(x)<=C.field(C.gx,"instance_globals_x","x_maze_max").value);((x=C.i16((x+1)))-1)) for((y=C.i16(1));Number(C.i32(y)<=C.field(C.gy,"instance_globals_y","y_maze_max").value);((y=C.i16((y+1)))-1)) if(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==allowedtyp)) {
        (C.field(cc,"nhcoord","x").value=x);
        (C.field(cc,"nhcoord","y").value=y);
        return;
    }


    /* every spot on the area of map allowed for mazes has been rejected */
    C.variadic(18,C.literal("mazexy: can't find a place!"));
    /*NOTREACHED*/
    return;
}

export function get_level_extends(left,top,right,bottom)
{
    left=C.ptr(left);
    top=C.ptr(top);
    right=C.ptr(right);
    bottom=C.ptr(bottom);
    let x; let y;
    let typ;
    let lev;
    let found; let nonwall;
    let xmin; let xmax; let ymin; let ymax;
    (found=(nonwall=(C.i8(0))));
    for((xmin=C.i16(0));Number(!!(Number(!(found))&&Number(C.i32(xmin)<=80)));((xmin=C.i16((xmin+1)))-1)) {
        (lev=((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(xmin)*(C.sizes["struct rm"]*21))+Number(0)*C.sizes["struct rm"]));
        for((y=C.i16(0));Number(C.i32(y)<=C.i32((21-1)));(((y=C.i16((y+1)))-1),((lev=C.ptr((lev+Number(C.sizes["struct rm"]))))-Number(C.sizes["struct rm"])))) {
            (typ=C.u32(C.field(lev,"rm","typ").value));
            if(Number(typ!=C.u32(C.STONE))) {
                (found=(C.i8(1)));
                if(Number(!((Number(!!((typ)&&Number((typ)<=C.u32(C.DBWALL)))))))) (nonwall=(C.i8(1)));
            }
        }
    }
    (xmin=C.i16(xmin-((Number(!!(C.i32(nonwall)||Number(!(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","is_maze_lev").value)))))?2:1)));
    if(Number(C.i32(xmin)<0)) (xmin=C.i16(0));
    (found=(nonwall=(C.i8(0))));
    for((xmax=C.i16(C.i32((80-1))));Number(!!(Number(!(found))&&Number(C.i32(xmax)>=0)));((xmax=C.i16((xmax-1)))+1)) {
        (lev=((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(xmax)*(C.sizes["struct rm"]*21))+Number(0)*C.sizes["struct rm"]));
        for((y=C.i16(0));Number(C.i32(y)<=C.i32((21-1)));(((y=C.i16((y+1)))-1),((lev=C.ptr((lev+Number(C.sizes["struct rm"]))))-Number(C.sizes["struct rm"])))) {
            (typ=C.u32(C.field(lev,"rm","typ").value));
            if(Number(typ!=C.u32(C.STONE))) {
                (found=(C.i8(1)));
                if(Number(!((Number(!!((typ)&&Number((typ)<=C.u32(C.DBWALL)))))))) (nonwall=(C.i8(1)));
            }
        }
    }
    (xmax=C.i16(xmax+((Number(!!(C.i32(nonwall)||Number(!(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","is_maze_lev").value)))))?2:1)));
    if(Number(C.i32(xmax)>=80)) (xmax=C.i16(C.i32((80-1))));
    (found=(nonwall=(C.i8(0))));
    for((ymin=C.i16(0));Number(!!(Number(!(found))&&Number(C.i32(ymin)<=21)));((ymin=C.i16((ymin+1)))-1)) {
        (lev=((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(xmin)*(C.sizes["struct rm"]*21))+Number(ymin)*C.sizes["struct rm"]));
        for((x=xmin);Number(C.i32(x)<=C.i32(xmax));(((x=C.i16((x+1)))-1),(lev=C.ptr(lev+21*C.sizes["struct rm"])))) {
            (typ=C.u32(C.field(lev,"rm","typ").value));
            if(Number(typ!=C.u32(C.STONE))) {
                (found=(C.i8(1)));
                if(Number(!((Number(!!((typ)&&Number((typ)<=C.u32(C.DBWALL)))))))) (nonwall=(C.i8(1)));
            }
        }
    }
    (ymin=C.i16(ymin-((Number(!!(C.i32(nonwall)||Number(!(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","is_maze_lev").value)))))?2:1)));
    (found=(nonwall=(C.i8(0))));
    for((ymax=C.i16(C.i32((21-1))));Number(!!(Number(!(found))&&Number(C.i32(ymax)>=0)));((ymax=C.i16((ymax-1)))+1)) {
        (lev=((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(xmin)*(C.sizes["struct rm"]*21))+Number(ymax)*C.sizes["struct rm"]));
        for((x=xmin);Number(C.i32(x)<=C.i32(xmax));(((x=C.i16((x+1)))-1),(lev=C.ptr(lev+21*C.sizes["struct rm"])))) {
            (typ=C.u32(C.field(lev,"rm","typ").value));
            if(Number(typ!=C.u32(C.STONE))) {
                (found=(C.i8(1)));
                if(Number(!((Number(!!((typ)&&Number((typ)<=C.u32(C.DBWALL)))))))) (nonwall=(C.i8(1)));
            }
        }
    }
    (ymax=C.i16(ymax+((Number(!!(C.i32(nonwall)||Number(!(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","is_maze_lev").value)))))?2:1)));
    (C.cell(left,"short").value=xmin);
    (C.cell(right,"short").value=xmax);
    (C.cell(top,"short").value=ymin);
    (C.cell(bottom,"short").value=ymax);
}

/* put a non-diggable/non-phaseable boundary around the initial portion
 * of a level map. assumes that no level will initially put things
 * beyond the isok() range.
 *
 * we can't bound unconditionally on the last line with something in it,
 * because that something might be a niche which was already reachable,
 * so the boundary would be breached
 *
 * we can't bound unconditionally on one beyond the last line, because
 * that provides a window of abuse for wallified special levels
 */
export function bound_digging()
{
    const stackFrame=C.stackSave();
    try {
    let x; let y;
    let xmin=C.local("short",0); let xmax=C.local("short",0); let ymin=C.local("short",0); let ymax=C.local("short",0);
    if(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_earth_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_earth_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_earth_level").address))))))) return;
    /* everything diggable here */
    get_level_extends(xmin.address,ymin.address,xmax.address,ymax.address);
    for((x=C.i16(0));Number(C.i32(x)<80);((x=C.i16((x+1)))-1)) for((y=C.i16(0));Number(C.i32(y)<21);((y=C.i16((y+1)))-1)) if((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))<=C.DBWALL))) {
        /* undiggable walls at edges, ... */
        if(Number(!!(Number(!!(Number(!!(Number(C.i32(y)<=C.i32(ymin.value))||Number(C.i32(y)>=C.i32(ymax.value))))||Number(C.i32(x)<=C.i32(xmin.value))))||Number(C.i32(x)>=C.i32(xmax.value))))) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value=C.u32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value|8));
        /* one tile past that, everything is also unphaseable */
        if(Number(!!(Number(!!(Number(!!(Number(C.i32(y)<C.i32(ymin.value))||Number(C.i32(y)>C.i32(ymax.value))))||Number(C.i32(x)<C.i32(xmin.value))))||Number(C.i32(x)>C.i32(xmax.value))))) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value=C.u32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value|16));
    }


    } finally {C.stackRestore(stackFrame); }
}

export function mkportal(x,y,todnum,todlevel)
{
    x=C.i16(x);
    y=C.i16(y);
    todnum=C.i16(todnum);
    todlevel=C.i16(todlevel);
    /* a portal "trap" must be matched by a
       portal in the destination dungeon/dlevel */
    let ttmp=C.maketrap(x,y,C.MAGIC_PORTAL);
    if(Number(!(ttmp))) {
        C.variadic(19,C.literal("portal on top of portal?"));
        return;
    }
    do {
        if(C.debugcore(C.literal("mkmaze.c"),(C.i8(1)))) {
            let save_plnmsg=C.field(C.iflags,"instance_flags","last_msg").value;
            C.variadic(20,C.literal("mkportal: at <%d,%d>, to %s, level %d"),C.i32(x),C.i32(y),C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(todnum)*C.sizes["struct dungeon"]),"dungeon","dname").address,C.i32(todlevel));
            (C.field(C.iflags,"instance_flags","last_msg").value=save_plnmsg);
        }
    } while(0);
    (C.field(C.field(ttmp,"trap","dst").address,"d_level","dnum").value=todnum);
    (C.field(C.field(ttmp,"trap","dst").address,"d_level","dlevel").value=todlevel);
    return;
}

/* augment the Plane of Fire; called from goto_level() when arriving and
   moveloop_core() when on the level */
export function fumaroles()
{
    let n; let nmax=C.i16(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1486,(C.literal("fumaroles"))),C.rn2(3))):C.rn2(3))));
    let sizemin=5;
    let snd=(C.i8(0)); let loud=(C.i8(0));
    if(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_fire_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_fire_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_fire_level").address))))))) {
        ((nmax=C.i16((nmax+1)))-1);
        (sizemin=C.i32(sizemin+5));
    }
    if(Number(C.i32(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","temperature").value)>0)) {
        ((nmax=C.i16((nmax+1)))-1);
        (sizemin=C.i32(sizemin+5));
    }
    for((n=nmax);n;((n=C.i16((n-1)))+1)) {
        let x=C.i16((C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1500,(C.literal("fumaroles"))),C.rn2(C.i32((80-4))))):C.rn2(C.i32((80-4)))))+(3)))));
        let y=C.i16((C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1501,(C.literal("fumaroles"))),C.rn2(C.i32((21-4))))):C.rn2(C.i32((21-4)))))+(3)))));
        if(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.LAVAPOOL)) {
            let r=C.create_gas_cloud(x,y,(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1504,(C.literal("fumaroles"))),C.rn2(10))):C.rn2(10)))+(sizemin)))),(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1504,(C.literal("fumaroles"))),C.rn2(10))):C.rn2(10)))+(5)))));
            ((C.field((r),"NhRegion","player_flags").value=C.u32(C.field((r),"NhRegion","player_flags").value|C.u32(2))));
            (snd=(C.i8(1)));
            if(Number(C.dist2((x),(y),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)<15)) (loud=(C.i8(1)));
        }
    }
    if(Number(!!(C.i32(snd)&&Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))))) C.variadic(21,C.literal("You hear a %swhoosh!"),(C.i32(loud)?C.literal("loud "):C.literal("")));
    /* Deaf-aware */
}

/*
 * Special waterlevel stuff in endgame (TH).
 *
 * Some of these functions would probably logically belong to some
 * other source files, but they are all so nicely encapsulated here.
 */
/* bubble movement boundaries */
/* the bubble hero is in */
/* augment the Planes of Water (for bubbles) and Air (for clouds); called
   from goto_level() when arriving and moveloop_core() when on the level */
export function movebubbles()
{
    
    
    let b;
    let cons;
    let btrap;
    let x; let y;
    let i; let j; let bcpin=0;
    /* set up the portal the first time bubbles are moved */
    if(Number(!(C.field(C.gw,"instance_globals_w","wportal").value))) set_wportal();
    C.vision_recalc(2);
    (C.cell(C.staticAddress("hero_bubble"),"struct bubble *").value=0);
    if(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address))))))) {
        /* keep attached ball&chain separate from bubble objects */
        if((Number(C.global("uball").value!=0))) (bcpin=C.unplacebc_and_covet_placebc());
        /*
         * Pick up everything inside of a bubble then fill all bubble
         * locations.
         */
        for((b=(C.i32(C.cell(C.staticAddress("up"),"signed char").value)?C.field(C.svb,"instance_globals_saved_b","bbubbles").value:C.field(C.ge,"instance_globals_e","ebubbles").value));b;(b=(C.i32(C.cell(C.staticAddress("up"),"signed char").value)?C.field(b,"bubble","next").value:C.field(b,"bubble","prev").value))) {
            if(C.field(b,"bubble","cons").value) C.variadic(22,C.literal("movebubbles: cons != null"));
            for(((i=0),(x=C.field(b,"bubble","x").value));Number(i<C.i32(C.cell((C.field(b,"bubble","bm").address+Number(0)*1),"unsigned char").value));(((i=C.i32((i+1)))-1),((x=C.i16((x+1)))-1))) for(((j=0),(y=C.field(b,"bubble","y").value));Number(j<C.i32(C.cell((C.field(b,"bubble","bm").address+Number(1)*1),"unsigned char").value));(((j=C.i32((j+1)))-1),((y=C.i16((y+1)))-1))) if(C.i32((C.i32(C.cell((C.field(b,"bubble","bm").address+Number(C.i32((j+2)))*1),"unsigned char").value)&(C.i32((1<<i)))))) {
                if(Number(!(C.isok(x,y)))) {
                    C.variadic(23,C.literal("movebubbles: bad pos (%d,%d)"),C.i32(x),C.i32(y));
                    continue;
                }
                /* pick up objects, monsters, hero, and traps */
                if((Number(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8),"struct obj *").value!=0))) {
                    let olist=0; let otmp;
                    while(Number(((otmp=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8),"struct obj *").value))!=0)) {
                        C.remove_object(otmp);
                        (C.field(otmp,"obj","ox").value=(C.field(otmp,"obj","oy").value=C.i16(0)));
                        (C.field(C.field(otmp,"obj","v").address,"vptrs","v_nexthere").value=olist);
                        (olist=otmp);
                    }
                    (cons=C.alloc(C.u32(BigInt(C.sizes["struct container"]))));
                    (C.field(cons,"container","x").value=x);
                    (C.field(cons,"container","y").value=y);
                    (C.field(cons,"container","what").value=C.i16(C.CONS_OBJ));
                    (C.field(cons,"container","list").value=olist);
                    (C.field(cons,"container","next").value=C.field(b,"bubble","cons").value);
                    (C.field(b,"bubble","cons").value=cons);
                }
                if((Number(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value!=0))) {
                    let mon=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value);
                    (cons=C.alloc(C.u32(BigInt(C.sizes["struct container"]))));
                    (C.field(cons,"container","x").value=x);
                    (C.field(cons,"container","y").value=y);
                    (C.field(cons,"container","what").value=C.i16(C.CONS_MON));
                    (C.field(cons,"container","list").value=mon);
                    (C.field(cons,"container","next").value=C.field(b,"bubble","cons").value);
                    (C.field(b,"bubble","cons").value=cons);
                    if(C.field(mon,"monst","wormno").value) C.remove_worm(mon);
 else (C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value=0);
                    C.newsym(x,y);
                    /* clean up old position */
                    (C.field(mon,"monst","mx").value=(C.field(mon,"monst","my").value=C.i16(0)));
                    (C.field(mon,"monst","mstate").value=C.i64(C.field(mon,"monst","mstate").value|C.i64(16)));
                }
                if(Number(!!(Number(!(C.field(C.u,"you","uswallow").value))&&(Number(!!(Number(C.i32((x))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((y))==C.i32(C.field(C.u,"you","uy").value)))))))) {
                    (cons=C.alloc(C.u32(BigInt(C.sizes["struct container"]))));
                    (C.field(cons,"container","x").value=x);
                    (C.field(cons,"container","y").value=y);
                    (C.field(cons,"container","what").value=C.i16(C.CONS_HERO));
                    (C.field(cons,"container","list").value=0);
                    (C.field(cons,"container","next").value=C.field(b,"bubble","cons").value);
                    (C.field(b,"bubble","cons").value=cons);
                    (C.cell(C.staticAddress("hero_bubble"),"struct bubble *").value=b);
                }
                if(Number(((btrap=C.t_at(x,y)))!=0)) {
                    (cons=C.alloc(C.u32(BigInt(C.sizes["struct container"]))));
                    (C.field(cons,"container","x").value=x);
                    (C.field(cons,"container","y").value=y);
                    (C.field(cons,"container","what").value=C.i16(C.CONS_TRAP));
                    (C.field(cons,"container","list").value=btrap);
                    (C.field(cons,"container","next").value=C.field(b,"bubble","cons").value);
                    (C.field(b,"bubble","cons").value=cons);
                }
                C.copy(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),C.staticAddress("water_pos"),C.sizes["struct rm"]);
                C.block_point(C.i32(x),C.i32(y));
            }


        }
    } else if(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address))))))) {
        let xedge; let yedge;
        for((x=C.i16(1));Number(C.i32(x)<=(C.i32((80-1))));((x=C.i16((x+1)))-1)) for((y=C.i16(0));Number(C.i32(y)<=(C.i32((21-1))));((y=C.i16((y+1)))-1)) {
            C.copy(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),C.staticAddress("air_pos"),C.sizes["struct rm"]);
            C.recalc_block_point(x,y);
            /* all air or all cloud around the perimeter of the Air
                   level tends to look strange; break up the pattern */
            (xedge=C.i8((Number(!!(Number(C.i32(x)<(C.i32((C.field(C.svx,"instance_globals_saved_x","xmin").value+1))))||Number(C.i32(x)>(C.i32((C.field(C.svx,"instance_globals_saved_x","xmax").value-1)))))))));
            (yedge=C.i8((Number(!!(Number(C.i32(y)<(C.i32((C.field(C.svy,"instance_globals_saved_y","ymin").value+1))))||Number(C.i32(y)>(C.i32((C.field(C.svy,"instance_globals_saved_y","ymax").value-1)))))))));
            if(Number(!!(C.i32(xedge)||C.i32(yedge)))) {
                if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1660,(C.literal("movebubbles"))),C.rn2((C.i32(xedge)?3:5)))):C.rn2((C.i32(xedge)?3:5))))))) {
                    (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value=C.i8(C.CLOUD));
                    C.block_point(C.i32(x),C.i32(y));
                }
            }
        }

    }
    /*
     * Every second time traverse down.  This is because otherwise
     * all the junk that changes owners when bubbles overlap
     * would eventually end up in the last bubble in the chain.
     */
    (C.cell(C.staticAddress("up"),"signed char").value=C.i8(Number(!(C.cell(C.staticAddress("up"),"signed char").value))));
    for((b=(C.i32(C.cell(C.staticAddress("up"),"signed char").value)?C.field(C.svb,"instance_globals_saved_b","bbubbles").value:C.field(C.ge,"instance_globals_e","ebubbles").value));b;(b=(C.i32(C.cell(C.staticAddress("up"),"signed char").value)?C.field(b,"bubble","next").value:C.field(b,"bubble","prev").value))) {
        let rx=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1675,(C.literal("movebubbles"))),C.rn2(3))):C.rn2(3))); let ry=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1675,(C.literal("movebubbles"))),C.rn2(3))):C.rn2(3)));
        mv_bubble(b,C.i16(C.i32((C.i32((C.i32(C.field(b,"bubble","dx").value)+1))-((Number(!(C.field(b,"bubble","dx").value))?rx:((rx?1:0))))))),C.i16(C.i32((C.i32((C.i32(C.field(b,"bubble","dy").value)+1))-((Number(!(C.field(b,"bubble","dy").value))?ry:((ry?1:0))))))),(C.i8(0)));
    }
    /* put attached ball&chain back */
    if(Number(!!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address))))))&&(Number(C.global("uball").value!=0))))) C.lift_covet_and_placebc(bcpin);
    (C.field(C.gv,"instance_globals_v","vision_full_recalc").value=C.i8(1));
}

/* when moving in water, possibly (1 in 3) alter the intended destination */
export function water_friction()
{
    let x; let y; let dx; let dy;
    let eff=(C.i8(0));
    if(Number(!!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.SWIMMING)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.SWIMMING)*C.sizes["struct prop"]),"prop","extrinsic").value))||(Number(!!(C.field(C.u,"you","usteed").value&&(Number((C.u64((C.field((C.field(C.field(C.u,"you","usteed").value,"monst","data").value),"permonst","mflags1").value&C.u64(2n))))!=C.u64(0n)))))))))&&((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1694,(C.literal("water_friction"))),C.rn2(4))):C.rn2(4)))))) return;
    /* natural swimmers have advantage */
    if(Number(!!(C.field(C.u,"you","dx").value&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1697,(C.literal("water_friction"))),C.rn2((Number(!(C.field(C.u,"you","dy").value))?3:6)))):C.rn2((Number(!(C.field(C.u,"you","dy").value))?3:6))))))))) {
        /* 1/3 chance or half that */
        /* cancel delta x and choose an arbitrary delta y value */
        (x=C.field(C.u,"you","ux").value);
        do {
            (dy=C.i16(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1701,(C.literal("water_friction"))),C.rn2(3))):C.rn2(3)))-1))));
            /* -1, 0, 1 */
            (y=C.i16(C.i32((C.i32(C.field(C.u,"you","uy").value)+C.i32(dy)))));
        } while(Number(!!(C.i32(dy)&&(Number(!!(Number(!(C.isok(x,y)))||Number(!(C.is_pool(x,y)))))))));
        (C.field(C.u,"you","dx").value=0);
        (C.field(C.u,"you","dy").value=C.i32(dy));
        (eff=(C.i8(1)));
    } else if(Number(!!(C.field(C.u,"you","dy").value&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1707,(C.literal("water_friction"))),C.rn2((Number(!(C.field(C.u,"you","dx").value))?3:5)))):C.rn2((Number(!(C.field(C.u,"you","dx").value))?3:5))))))))) {
        /* 1/3 or 1/5*(5/6) */
        /* cancel delta y and choose an arbitrary delta x value */
        (y=C.field(C.u,"you","uy").value);
        do {
            (dx=C.i16(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1711,(C.literal("water_friction"))),C.rn2(3))):C.rn2(3)))-1))));
            /* -1 .. 1 */
            (x=C.i16(C.i32((C.i32(C.field(C.u,"you","ux").value)+C.i32(dx)))));
        } while(Number(!!(C.i32(dx)&&(Number(!!(Number(!(C.isok(x,y)))||Number(!(C.is_pool(x,y)))))))));
        (C.field(C.u,"you","dy").value=0);
        (C.field(C.u,"you","dx").value=C.i32(dx));
        (eff=(C.i8(1)));
    }
    if(eff) C.variadic(24,C.literal("Water turbulence affects your movements."));
}

export function save_waterlevel(nhfp)
{
    nhfp=C.ptr(nhfp);
    const stackFrame=C.stackSave();
    try {
    let b;
    if(Number(!(C.field(C.svb,"instance_globals_saved_b","bbubbles").value))) return;
    if((C.i32((C.field((nhfp),"nh_file","mode").value&(C.i32((1|2))))))) {
        let n=C.local("int",0);
        for((b=C.field(C.svb,"instance_globals_saved_b","bbubbles").value);b;(b=C.field(b,"bubble","next").value)) (n.value=C.i32((n.value+1)));

        C.sfo_int(nhfp,n.address,C.literal("waterlevel-bubble_count"));
        C.sfo_int(nhfp,C.field(C.svx,"instance_globals_saved_x","xmin").address,C.literal("waterlevel-xmin"));
        C.sfo_int(nhfp,C.field(C.svy,"instance_globals_saved_y","ymin").address,C.literal("waterlevel-ymin"));
        C.sfo_int(nhfp,C.field(C.svx,"instance_globals_saved_x","xmax").address,C.literal("waterlevel-xmax"));
        C.sfo_int(nhfp,C.field(C.svy,"instance_globals_saved_y","ymax").address,C.literal("waterlevel-ymax"));
        for((b=C.field(C.svb,"instance_globals_saved_b","bbubbles").value);b;(b=C.field(b,"bubble","next").value)) {
            C.sfo_bubble(nhfp,b,C.literal("waterlevel-bubble"));
        }
    }
    if((C.i32((C.field((nhfp),"nh_file","mode").value&4)))) unsetup_waterlevel();
    } finally {C.stackRestore(stackFrame); }
}

/* !SFCTOOL */
/* restoring air bubbles on Plane of Water or clouds on Plane of Air */
export function restore_waterlevel(nhfp)
{
    nhfp=C.ptr(nhfp);
    const stackFrame=C.stackSave();
    try {
    let b=0; let btmp;
    let i; let n=C.local("int",0);
    /* set_wportal(); */
    C.sfi_int(nhfp,n.address,C.literal("waterlevel-bubble_count"));
    ;
    C.sfi_int(nhfp,C.field(C.svx,"instance_globals_saved_x","xmin").address,C.literal("waterlevel-xmin"));
    ;
    C.sfi_int(nhfp,C.field(C.svy,"instance_globals_saved_y","ymin").address,C.literal("waterlevel-ymin"));
    ;
    C.sfi_int(nhfp,C.field(C.svx,"instance_globals_saved_x","xmax").address,C.literal("waterlevel-xmax"));
    ;
    C.sfi_int(nhfp,C.field(C.svy,"instance_globals_saved_y","ymax").address,C.literal("waterlevel-ymax"));
    ;
    for((i=0);Number(i<n.value);((i=C.i32((i+1)))-1)) {
        (btmp=b);
        (b=C.alloc(C.u32(BigInt(C.sizes["struct bubble"]))));
        C.sfi_bubble(nhfp,b,C.literal("waterlevel-bubble"));
        if(btmp) {
            (C.field(btmp,"bubble","next").value=b);
            (C.field(b,"bubble","prev").value=btmp);
        } else {
            (C.field(C.svb,"instance_globals_saved_b","bbubbles").value=b);
            (C.field(b,"bubble","prev").value=0);
        }
        mv_bubble(b,C.i16(0),C.i16(0),(C.i8(1)));
    }
    (C.field(C.ge,"instance_globals_e","ebubbles").value=b);
    if(b) {
        (C.field(b,"bubble","next").value=0);
    } else {
        /* avoid "saving and reloading may fix this" */
        (C.field(C.program_state,"sinfo","something_worth_saving").value=0);
        /* during restore, information about what level this is might not
           be available so we're wishy-washy about what we describe */
        C.variadic(25,C.literal("No %s to restore?"),((Number(!!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address))))))||((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.gu,"instance_globals_u","uz_save").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address)))))))))?C.literal("air bubbles"):((Number(!!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address))))))||((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.gu,"instance_globals_u","uz_save").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address)))))))))?C.literal("clouds"):C.literal("air bubbles or clouds"))));
        (C.field(C.program_state,"sinfo","something_worth_saving").value=1);
    }
    } finally {C.stackRestore(stackFrame); }
}

export function set_wportal()
{
    /* there better be only one magic portal on water level... */
    for((C.field(C.gw,"instance_globals_w","wportal").value=C.field(C.gf,"instance_globals_f","ftrap").value);C.field(C.gw,"instance_globals_w","wportal").value;(C.field(C.gw,"instance_globals_w","wportal").value=C.field(C.field(C.gw,"instance_globals_w","wportal").value,"trap","ntrap").value)) if(Number(C.i32(C.field(C.field(C.gw,"instance_globals_w","wportal").value,"trap","ttyp").value)==C.MAGIC_PORTAL)) return;

    C.variadic(26,C.literal("set_wportal(): no portal!"));
}

export function setup_waterlevel()
{
    let typ; let glyph;
    let x; let y; let xskip; let yskip;
    if(Number(!!(Number(!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address))))))))&&Number(!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address))))))))))) C.variadic(27,C.literal("setup_waterlevel(): [%d:%d] neither 'Water' nor 'Air'"),C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value),C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dlevel").value));
    /* ouch, hardcoded... (file scope statics and used in bxmin,bymax,&c) */
    (C.field(C.svx,"instance_globals_saved_x","xmin").value=3);
    (C.field(C.svy,"instance_globals_saved_y","ymin").value=1);
    /* use separate statements so that compiler won't complain about min()
       comparing two constants; the alternative is to do this in the
       preprocessor: #if (20 > ROWNO-1) ymax=ROWNO-1 #else ymax=20 #endif */
    (C.field(C.svx,"instance_globals_saved_x","xmax").value=78);
    (C.field(C.svx,"instance_globals_saved_x","xmax").value=((Number((C.field(C.svx,"instance_globals_saved_x","xmax").value)<(C.i32(((C.i32((80-1)))-1))))?(C.field(C.svx,"instance_globals_saved_x","xmax").value):(C.i32(((C.i32((80-1)))-1))))));
    (C.field(C.svy,"instance_globals_saved_y","ymax").value=20);
    (C.field(C.svy,"instance_globals_saved_y","ymax").value=((Number((C.field(C.svy,"instance_globals_saved_y","ymax").value)<((C.i32((21-1)))))?(C.field(C.svy,"instance_globals_saved_y","ymax").value):((C.i32((21-1)))))));
    /* entire level is remembered as one glyph and any unspecified portion
       should default to level's base element rather than to usual stone */
    (glyph=(((Number(((((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address))))))?C.S_water:C.S_air))==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number(((((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address))))))?C.S_water:C.S_air))<=C.S_trwall))?(C.i32((C.i32((((((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address))))))?C.S_water:C.S_air))-C.S_vwall))+((C.i32(C.In_mines(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoban_dnum").value))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number(((((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address))))))?C.S_water:C.S_air))<C.S_altar))?(C.i32(((C.i32((((((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address))))))?C.S_water:C.S_air))-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number(((((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address))))))?C.S_water:C.S_air))==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number(((((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address))))))?C.S_water:C.S_air))<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32((((((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address))))))?C.S_water:C.S_air))-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number(((((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address))))))?C.S_water:C.S_air))<=C.S_goodpos))?(C.i32(((C.i32((((((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address))))))?C.S_water:C.S_air))-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))));
    (typ=(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address))))))?C.WATER:C.AIR));
    /* set unspecified terrain (stone) and hero's memory to water or air */
    for((x=C.i16(1));Number(C.i32(x)<=C.i32((80-1)));((x=C.i16((x+1)))-1)) for((y=C.i16(0));Number(C.i32(y)<=C.i32((21-1)));((y=C.i16((y+1)))-1)) {
        (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","glyph").value=glyph);
        if(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.STONE)) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value=C.i8(typ));
    }

    /* make bubbles */
    if(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address))))))) {
        (xskip=C.i16(C.i32((10+((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1847,(C.literal("setup_waterlevel"))),C.rn2(10))):C.rn2(10)))))));
        (yskip=C.i16(C.i32((4+((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1848,(C.literal("setup_waterlevel"))),C.rn2(4))):C.rn2(4)))))));
    } else {
        (xskip=C.i16(C.i32((6+((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1850,(C.literal("setup_waterlevel"))),C.rn2(4))):C.rn2(4)))))));
        (yskip=C.i16(C.i32((3+((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1851,(C.literal("setup_waterlevel"))),C.rn2(3))):C.rn2(3)))))));
    }
    for((x=C.i16((C.i32((C.field(C.svx,"instance_globals_saved_x","xmin").value+1)))));Number(C.i32(x)<=(C.i32((C.field(C.svx,"instance_globals_saved_x","xmax").value-1))));(x=C.i16(x+C.i32(xskip)))) for((y=C.i16((C.i32((C.field(C.svy,"instance_globals_saved_y","ymin").value+1)))));Number(C.i32(y)<=(C.i32((C.field(C.svy,"instance_globals_saved_y","ymax").value-1))));(y=C.i16(y+C.i32(yskip)))) mk_bubble(x,y,((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1856,(C.literal("setup_waterlevel"))),C.rn2(7))):C.rn2(7))));


}

export function unsetup_waterlevel()
{
    let b; let bb;
    /* free bubbles */
    for((b=C.field(C.svb,"instance_globals_saved_b","bbubbles").value);b;(b=bb)) {
        (bb=C.field(b,"bubble","next").value);
        C.free(b);
    }
    (C.field(C.svb,"instance_globals_saved_b","bbubbles").value=(C.field(C.ge,"instance_globals_e","ebubbles").value=0));
}

export function mk_bubble(x,y,n)
{
    x=C.i16(x);
    y=C.i16(y);
    n=C.i32(n);
    /*
     * These bit masks make visually pleasing bubbles on a normal aspect
     * 25x80 terminal, which naturally results in them being mathematically
     * anything but symmetric.  For this reason they cannot be computed
     * in situ, either.  The first two elements tell the dimensions of
     * the bubble's bounding box.
     */
    
    let b;
    if(Number(!!(Number(C.i32(x)>=(C.i32((C.field(C.svx,"instance_globals_saved_x","xmax").value-1))))||Number(C.i32(y)>=(C.i32((C.field(C.svy,"instance_globals_saved_y","ymax").value-1))))))) return;
    if(Number(n>=C.i32((C.u64((BigInt((8*7))/BigInt(8))))))) {
        C.variadic(28,C.literal("n too large (mk_bubble)"));
        (n=C.i32((C.i32((C.u64((BigInt((8*7))/BigInt(8)))))-1)));
    }
    if(Number(C.i32(C.cell((C.cell((C.staticAddress("bmask")+Number(n)*8),"unsigned char *").value+Number(1)*1),"unsigned char").value)>4)) {
        C.variadic(29,C.literal("bmask size is larger than MAX_BMASK"));
    }
    (b=C.alloc(C.u32(BigInt(C.sizes["struct bubble"]))));
    if(Number((C.i32((C.i32((C.i32(x)+C.i32(C.cell((C.cell((C.staticAddress("bmask")+Number(n)*8),"unsigned char *").value+Number(0)*1),"unsigned char").value)))-1)))>(C.i32((C.field(C.svx,"instance_globals_saved_x","xmax").value-1))))) (x=C.i16(C.i32((C.i32(((C.i32((C.field(C.svx,"instance_globals_saved_x","xmax").value-1)))-C.i32(C.cell((C.cell((C.staticAddress("bmask")+Number(n)*8),"unsigned char *").value+Number(0)*1),"unsigned char").value)))+1))));
    if(Number((C.i32((C.i32((C.i32(y)+C.i32(C.cell((C.cell((C.staticAddress("bmask")+Number(n)*8),"unsigned char *").value+Number(1)*1),"unsigned char").value)))-1)))>(C.i32((C.field(C.svy,"instance_globals_saved_y","ymax").value-1))))) (y=C.i16(C.i32((C.i32(((C.i32((C.field(C.svy,"instance_globals_saved_y","ymax").value-1)))-C.i32(C.cell((C.cell((C.staticAddress("bmask")+Number(n)*8),"unsigned char *").value+Number(1)*1),"unsigned char").value)))+1))));
    (C.field(b,"bubble","x").value=x);
    (C.field(b,"bubble","y").value=y);
    (C.field(b,"bubble","dx").value=C.i8(C.i32((1-((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1909,(C.literal("mk_bubble"))),C.rn2(3))):C.rn2(3)))))));
    (C.field(b,"bubble","dy").value=C.i8(C.i32((1-((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1910,(C.literal("mk_bubble"))),C.rn2(3))):C.rn2(3)))))));
    /* y dimension is the length of bitmap data - see bmask above */
    C.memcpy(C.field(b,"bubble","bm").address,C.cell((C.staticAddress("bmask")+Number(n)*8),"unsigned char *").value,C.u64((C.u64((C.i32((C.i32(C.cell((C.cell((C.staticAddress("bmask")+Number(n)*8),"unsigned char *").value+Number(1)*1),"unsigned char").value)+2))))*BigInt(1))));
    (C.field(b,"bubble","cons").value=0);
    if(Number(!(C.field(C.svb,"instance_globals_saved_b","bbubbles").value))) (C.field(C.svb,"instance_globals_saved_b","bbubbles").value=b);
    if(C.field(C.ge,"instance_globals_e","ebubbles").value) {
        (C.field(C.field(C.ge,"instance_globals_e","ebubbles").value,"bubble","next").value=b);
        (C.field(b,"bubble","prev").value=C.field(C.ge,"instance_globals_e","ebubbles").value);
    } else (C.field(b,"bubble","prev").value=0);
    (C.field(b,"bubble","next").value=0);
    (C.field(C.ge,"instance_globals_e","ebubbles").value=b);
    mv_bubble(b,C.i16(0),C.i16(0),(C.i8(1)));
}

/* maybe change the movement direction of the bubble hero is in */
export function maybe_adjust_hero_bubble()
{
    if(Number(!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address))))))))) return;
    if(Number(!!(Number(!(C.field(C.u,"you","dx").value))&&Number(!(C.field(C.u,"you","dy").value))))) return;
    if(Number(!!(C.cell(C.staticAddress("hero_bubble"),"struct bubble *").value&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1937,(C.literal("maybe_adjust_hero_bubble"))),C.rn2(2))):C.rn2(2)))))))) {
        (C.field(C.cell(C.staticAddress("hero_bubble"),"struct bubble *").value,"bubble","dx").value=C.i8(C.field(C.u,"you","dx").value));
        (C.field(C.cell(C.staticAddress("hero_bubble"),"struct bubble *").value,"bubble","dy").value=C.i8(C.field(C.u,"you","dy").value));
    }
}

/*
 * The player, the portal and all other objects and monsters
 * float along with their associated bubbles.  Bubbles may overlap
 * freely, and the contents may get associated with other bubbles in
 * the process.  Bubbles are "sticky", meaning that if the player is
 * in the immediate neighborhood of one, he/she may get sucked inside.
 * This property also makes leaving a bubble slightly difficult.
 */
export function mv_bubble(b,dx,dy,ini)
{
    b=C.ptr(b);
    dx=C.i16(dx);
    dy=C.i16(dy);
    ini=C.i8(ini);
    let i; let j; let colli=0;
    let x; let y;
    let cons; let ctemp;
    /* clouds move slowly */
    if(Number(!!(Number(!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address))))))))||Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),1959,(C.literal("mv_bubble"))),C.rn2(6))):C.rn2(6)))))))) {
        /* move bubble */
        if(Number(!!(Number(!!(Number(!!(Number(C.i32(dx)<C.i32((-1)))||Number(C.i32(dx)>1)))||Number(C.i32(dy)<C.i32((-1)))))||Number(C.i32(dy)>1)))) {
            /* pline("mv_bubble: dx = %d, dy = %d", dx, dy); */
            (dx=C.i16(C.sgn(C.i32(dx))));
            (dy=C.i16(C.sgn(C.i32(dy))));
        }
        /*
         * collision with level borders?
         *      1 = horizontal border, 2 = vertical, 3 = corner
         */
        if(Number(C.i32(C.field(b,"bubble","x").value)<=(C.i32((C.field(C.svx,"instance_globals_saved_x","xmin").value+1))))) (colli=C.i32(colli|2));
        if(Number(C.i32(C.field(b,"bubble","y").value)<=(C.i32((C.field(C.svy,"instance_globals_saved_y","ymin").value+1))))) (colli=C.i32(colli|1));
        if(Number((C.i32((C.i32((C.i32(C.field(b,"bubble","x").value)+C.i32(C.cell((C.field(b,"bubble","bm").address+Number(0)*1),"unsigned char").value)))-1)))>=(C.i32((C.field(C.svx,"instance_globals_saved_x","xmax").value-1))))) (colli=C.i32(colli|2));
        if(Number((C.i32((C.i32((C.i32(C.field(b,"bubble","y").value)+C.i32(C.cell((C.field(b,"bubble","bm").address+Number(1)*1),"unsigned char").value)))-1)))>=(C.i32((C.field(C.svy,"instance_globals_saved_y","ymax").value-1))))) (colli=C.i32(colli|1));
        if(Number(C.i32(C.field(b,"bubble","x").value)<(C.i32((C.field(C.svx,"instance_globals_saved_x","xmin").value+1))))) {
            C.variadic(30,C.literal("bubble xmin: x = %d, xmin = %d"),C.i32(C.field(b,"bubble","x").value),(C.i32((C.field(C.svx,"instance_globals_saved_x","xmin").value+1))));
            (C.field(b,"bubble","x").value=C.i16((C.i32((C.field(C.svx,"instance_globals_saved_x","xmin").value+1)))));
        }
        if(Number(C.i32(C.field(b,"bubble","y").value)<(C.i32((C.field(C.svy,"instance_globals_saved_y","ymin").value+1))))) {
            C.variadic(31,C.literal("bubble ymin: y = %d, ymin = %d"),C.i32(C.field(b,"bubble","y").value),(C.i32((C.field(C.svy,"instance_globals_saved_y","ymin").value+1))));
            (C.field(b,"bubble","y").value=C.i16((C.i32((C.field(C.svy,"instance_globals_saved_y","ymin").value+1)))));
        }
        if(Number((C.i32((C.i32((C.i32(C.field(b,"bubble","x").value)+C.i32(C.cell((C.field(b,"bubble","bm").address+Number(0)*1),"unsigned char").value)))-1)))>(C.i32((C.field(C.svx,"instance_globals_saved_x","xmax").value-1))))) {
            C.variadic(32,C.literal("bubble xmax: x = %d, xmax = %d"),C.i32((C.i32((C.i32(C.field(b,"bubble","x").value)+C.i32(C.cell((C.field(b,"bubble","bm").address+Number(0)*1),"unsigned char").value)))-1)),(C.i32((C.field(C.svx,"instance_globals_saved_x","xmax").value-1))));
            (C.field(b,"bubble","x").value=C.i16(C.i32((C.i32(((C.i32((C.field(C.svx,"instance_globals_saved_x","xmax").value-1)))-C.i32(C.cell((C.field(b,"bubble","bm").address+Number(0)*1),"unsigned char").value)))+1))));
        }
        if(Number((C.i32((C.i32((C.i32(C.field(b,"bubble","y").value)+C.i32(C.cell((C.field(b,"bubble","bm").address+Number(1)*1),"unsigned char").value)))-1)))>(C.i32((C.field(C.svy,"instance_globals_saved_y","ymax").value-1))))) {
            C.variadic(33,C.literal("bubble ymax: y = %d, ymax = %d"),C.i32((C.i32((C.i32(C.field(b,"bubble","y").value)+C.i32(C.cell((C.field(b,"bubble","bm").address+Number(1)*1),"unsigned char").value)))-1)),(C.i32((C.field(C.svy,"instance_globals_saved_y","ymax").value-1))));
            (C.field(b,"bubble","y").value=C.i16(C.i32((C.i32(((C.i32((C.field(C.svy,"instance_globals_saved_y","ymax").value-1)))-C.i32(C.cell((C.field(b,"bubble","bm").address+Number(1)*1),"unsigned char").value)))+1))));
        }
        /* bounce if we're trying to move off the border */
        if(Number(!!(Number(C.i32(C.field(b,"bubble","x").value)==(C.i32((C.field(C.svx,"instance_globals_saved_x","xmin").value+1))))&&Number(C.i32(dx)<0)))) (dx=C.i16(C.i32((-C.i32(dx)))));
        if(Number(!!(Number(C.i32((C.i32((C.i32(C.field(b,"bubble","x").value)+C.i32(C.cell((C.field(b,"bubble","bm").address+Number(0)*1),"unsigned char").value)))-1))==(C.i32((C.field(C.svx,"instance_globals_saved_x","xmax").value-1))))&&Number(C.i32(dx)>0)))) (dx=C.i16(C.i32((-C.i32(dx)))));
        if(Number(!!(Number(C.i32(C.field(b,"bubble","y").value)==(C.i32((C.field(C.svy,"instance_globals_saved_y","ymin").value+1))))&&Number(C.i32(dy)<0)))) (dy=C.i16(C.i32((-C.i32(dy)))));
        if(Number(!!(Number(C.i32((C.i32((C.i32(C.field(b,"bubble","y").value)+C.i32(C.cell((C.field(b,"bubble","bm").address+Number(1)*1),"unsigned char").value)))-1))==(C.i32((C.field(C.svy,"instance_globals_saved_y","ymax").value-1))))&&Number(C.i32(dy)>0)))) (dy=C.i16(C.i32((-C.i32(dy)))));
        (C.field(b,"bubble","x").value=C.i16(C.field(b,"bubble","x").value+C.i32(dx)));
        (C.field(b,"bubble","y").value=C.i16(C.field(b,"bubble","y").value+C.i32(dy)));
    }
    /* draw the bubbles */
    for(((i=0),(x=C.field(b,"bubble","x").value));Number(i<C.i32(C.cell((C.field(b,"bubble","bm").address+Number(0)*1),"unsigned char").value));(((i=C.i32((i+1)))-1),((x=C.i16((x+1)))-1))) for(((j=0),(y=C.field(b,"bubble","y").value));Number(j<C.i32(C.cell((C.field(b,"bubble","bm").address+Number(1)*1),"unsigned char").value));(((j=C.i32((j+1)))-1),((y=C.i16((y+1)))-1))) if(C.i32((C.i32(C.cell((C.field(b,"bubble","bm").address+Number(C.i32((j+2)))*1),"unsigned char").value)&(C.i32((1<<i)))))) {
        if(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address))))))) {
            (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value=C.i8(C.AIR));
            (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","lit").value=C.u32(1));
            C.unblock_point(C.i32(x),C.i32(y));
        } else if(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address))))))) {
            (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value=C.i8(C.CLOUD));
            (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","lit").value=C.u32(1));
            C.block_point(C.i32(x),C.i32(y));
        }
    }


    if(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address))))))) {
        /* replace contents of bubble */
        for((cons=C.field(b,"bubble","cons").value);cons;(cons=ctemp)) {
            (ctemp=C.field(cons,"container","next").value);
            (C.field(cons,"container","x").value=C.i16(C.field(cons,"container","x").value+C.i32(dx)));
            (C.field(cons,"container","y").value=C.i16(C.field(cons,"container","y").value+C.i32(dy)));
            switch(C.i32(C.field(cons,"container","what").value)) {
                case (C.CONS_OBJ):
{
                        let olist; let otmp;
                        for((olist=C.field(cons,"container","list").value);olist;(olist=otmp)) {
                            (otmp=C.field(C.field(olist,"obj","v").address,"vptrs","v_nexthere").value);
                            C.place_object(olist,C.field(cons,"container","x").value,C.field(cons,"container","y").value);
                            C.stackobj(olist);
                        }
                        break;
                    }                case (C.CONS_MON):
{
                        let mon=C.field(cons,"container","list").value;
                        /* mnearto() might fail. We can jump right to elemental_clog
                   from here rather than deal_with_overcrowding() */
                        if(Number(!(C.mnearto(mon,C.field(cons,"container","x").value,C.field(cons,"container","y").value,(C.i8(1)),C.u32(4))))) C.elemental_clog(mon);
                        break;
                    }                case (C.CONS_HERO):
{
                        let mtmp=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(C.field(cons,"container","x").value)*(8*21))+Number(C.field(cons,"container","y").value)*8),"struct monst *").value);
                        let ux0=C.i32(C.field(C.u,"you","ux").value); let uy0=C.i32(C.field(C.u,"you","uy").value);
                        C.u_on_newpos(C.field(cons,"container","x").value,C.field(cons,"container","y").value);
                        C.newsym(C.i16(ux0),C.i16(uy0));
                        /* clean up old position */
                        if(mtmp) {
                            C.mnexto(mtmp,C.u32(4));
                        }
                        break;
                    }                case (C.CONS_TRAP):
{
                        let btrap=C.field(cons,"container","list").value;
                        (C.field(btrap,"trap","tx").value=C.field(cons,"container","x").value);
                        (C.field(btrap,"trap","ty").value=C.field(cons,"container","y").value);
                        break;
                    }                default:
                    C.variadic(34,C.literal("mv_bubble: unknown bubble contents"));
                break;
            }
            C.free(cons);
        }
        (C.field(b,"bubble","cons").value=0);
    }
    /* boing? */
    switch(colli) {
        case (1):
            (C.field(b,"bubble","dy").value=C.i8(C.i32((-C.i32(C.field(b,"bubble","dy").value)))));
        break;
        case (3):
            (C.field(b,"bubble","dy").value=C.i8(C.i32((-C.i32(C.field(b,"bubble","dy").value)))));
        ;
        /*FALLTHRU*/
        case (2):
            (C.field(b,"bubble","dx").value=C.i8(C.i32((-C.i32(C.field(b,"bubble","dx").value)))));
        break;
        default:
            /* sometimes alter direction for fun anyway
           (higher probability for stationary bubbles) */
            if(Number(!!(Number(!(ini))&&(((Number(!!(C.i32(C.field(b,"bubble","dx").value)||C.i32(C.field(b,"bubble","dy").value))))?Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),2102,(C.literal("mv_bubble"))),C.rn2(20))):C.rn2(20))))):Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),2102,(C.literal("mv_bubble"))),C.rn2(5))):C.rn2(5)))))))))) {
                (C.field(b,"bubble","dx").value=C.i8(C.i32((1-((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),2103,(C.literal("mv_bubble"))),C.rn2(3))):C.rn2(3)))))));
                (C.field(b,"bubble","dy").value=C.i8(C.i32((1-((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkmaze.c"),2104,(C.literal("mv_bubble"))),C.rn2(3))):C.rn2(3)))))));
            }
    }
}

/* !SFCTOOL */
/*mkmaze.c*/
export const mkmazeStaticInitializers = C => [
    {name:"spine_array",type:"short[16]",size:(2*16),values:[C.i16(C.VWALL),C.i16(C.HWALL),C.i16(C.HWALL),C.i16(C.HWALL),C.i16(C.VWALL),C.i16(C.TRCORNER),C.i16(C.TLCORNER),C.i16(C.TDWALL),C.i16(C.VWALL),C.i16(C.BRCORNER),C.i16(C.BLCORNER),C.i16(C.TUWALL),C.i16(C.VWALL),C.i16(C.TLWALL),C.i16(C.TRWALL),C.i16(C.CROSSWALL)]},
    {name:"orcfruit",type:"char *[2]",size:(8*2),values:[C.literal("paddle cactus"),C.literal("dwarven root")]},
    {name:"hero_bubble",type:"struct bubble *",size:8,values:0},
    {name:"water_pos",type:"struct rm",size:C.sizes["struct rm"],values:[(C.i32(((C.i32(((C.S_water)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))),C.i8(C.WATER),C.u8(0),C.u32(0),C.u32(0),C.u32(0),C.u32(0),C.u32(0),C.u32(0),C.u32(0)]},
    {name:"air_pos",type:"struct rm",size:C.sizes["struct rm"],values:[(C.i32(((C.i32(((C.S_cloud)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))),C.i8(C.AIR),C.u8(0),C.u32(0),C.u32(0),C.u32(1),C.u32(0),C.u32(0),C.u32(0),C.u32(0)]},
    {name:"up",type:"signed char",size:1,values:(C.i8(0))},
    {name:"bm2",type:"unsigned char[3]",size:(1*3),values:[C.u8(2),C.u8(1),C.u8(3)]},
    {name:"bm3",type:"unsigned char[4]",size:(1*4),values:[C.u8(3),C.u8(2),C.u8(7),C.u8(7)]},
    {name:"bm4",type:"unsigned char[5]",size:(1*5),values:[C.u8(4),C.u8(3),C.u8(6),C.u8(15),C.u8(6)]},
    {name:"bm5",type:"unsigned char[5]",size:(1*5),values:[C.u8(5),C.u8(3),C.u8(14),C.u8(31),C.u8(14)]},
    {name:"bm6",type:"unsigned char[6]",size:(1*6),values:[C.u8(6),C.u8(4),C.u8(30),C.u8(63),C.u8(63),C.u8(30)]},
    {name:"bm7",type:"unsigned char[6]",size:(1*6),values:[C.u8(7),C.u8(4),C.u8(62),C.u8(127),C.u8(127),C.u8(62)]},
    {name:"bm8",type:"unsigned char[6]",size:(1*6),values:[C.u8(8),C.u8(4),C.u8(126),C.u8(255),C.u8(255),C.u8(126)]},
    {name:"bmask",type:"unsigned char *[7]",size:(8*7),values:[C.staticAddress("bm2"),C.staticAddress("bm3"),C.staticAddress("bm4"),C.staticAddress("bm5"),C.staticAddress("bm6"),C.staticAddress("bm7"),C.staticAddress("bm8")]},
];
