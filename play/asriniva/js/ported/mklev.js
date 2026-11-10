import { C } from './c-runtime.js';
/* NetHack 5.0	mklev.c	$NHDT-Date: 1737387068 2025/01/20 07:31:08 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.194 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Alex Smith, 2017. */
/* NetHack may be freely redistributed.  See license for details. */
/* for UNIX, Rand #def'd to (long)lrand48() or (long)random() */
/* croom->lx etc are schar (width <= int), so % arith ensures that */
/* conversion of result to int is reasonable */
/* Args must be (const genericptr) so that qsort will always be happy. */
export function mkroom_cmp(vx,vy)
{
    vx=C.ptr(vx);
    vy=C.ptr(vy);
    let x; let y;
    (x=vx);
    (y=vy);
    if(Number(C.i32(C.field(x,"mkroom","lx").value)<C.i32(C.field(y,"mkroom","lx").value))) return C.i32((-1));
    return (Number(C.i32(C.field(x,"mkroom","lx").value)>C.i32(C.field(y,"mkroom","lx").value)));
}

/* is x,y a good location for a door into room? */
export function good_rm_wall_doorpos(x,y,dir,room)
{
    x=C.i16(x);
    y=C.i16(y);
    dir=C.i32(dir);
    room=C.ptr(room);
    let tx; let ty;
    let rmno;
    if(Number(!!(Number(!(C.isok(x,y)))||Number(!(C.field(room,"mkroom","needjoining").value))))) return (C.i8(0));
    if(Number(!((Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.HWALL)||Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.VWALL)))||(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))==C.DOOR))))||Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.SDOOR))))))) return (C.i8(0));
    if(bydoor(x,y)) return (C.i8(0));
    (tx=C.i16(C.i32((C.i32(x)+C.i32(C.cell((C.xdir+Number(dir)*1),"signed char").value)))));
    (ty=C.i16(C.i32((C.i32(y)+C.i32(C.cell((C.ydir+Number(dir)*1),"signed char").value)))));
    if(Number(!!(Number(!(C.isok(tx,ty)))||(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(tx)*(C.sizes["struct rm"]*21))+Number(ty)*C.sizes["struct rm"]),"rm","typ").value))<C.POOL))))) return (C.i8(0));
    (rmno=C.i32(C.i64(((C.i64(((room-C.field(C.svr,"instance_globals_saved_r","rooms").address)/C.sizes["struct mkroom"])))+C.i64(3)))));
    if(Number(rmno!=C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(tx)*(C.sizes["struct rm"]*21))+Number(ty)*C.sizes["struct rm"]),"rm","roomno").value))) return (C.i8(0));
    return (C.i8(1));
}

/* starting from x,y going towards dir, find a good location for a door */
export function finddpos_shift(x,y,dir,aroom)
{
    x=C.ptr(x);
    y=C.ptr(y);
    dir=C.i32(dir);
    aroom=C.ptr(aroom);
    let dx; let dy;
    (dir=(C.i32(((C.i32(((dir)+4)))%(C.i32((C.N_DIRS_Z-2)))))));
    (dx=C.i16(C.cell((C.xdir+Number(dir)*1),"signed char").value));
    (dy=C.i16(C.cell((C.ydir+Number(dir)*1),"signed char").value));
    if(good_rm_wall_doorpos(C.cell(x,"short").value,C.cell(y,"short").value,dir,aroom)) return (C.i8(1));
    /* irregular rooms may have the room wall away from the room rectangular
       area; go into the area until we encounter something */
    if(C.field(aroom,"mkroom","irregular").value) {
        let rx=C.cell(x,"short").value; let ry=C.cell(y,"short").value;
        let fail=(C.i8(0));
        while(Number(!!(Number(!!(Number(!(fail))&&C.isok(rx,ry)))&&(Number(!!(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(rx)*(C.sizes["struct rm"]*21))+Number(ry)*C.sizes["struct rm"]),"rm","typ").value)==C.STONE)||Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(rx)*(C.sizes["struct rm"]*21))+Number(ry)*C.sizes["struct rm"]),"rm","typ").value)==C.CORR))))))) {
            (rx=C.i16(rx+C.i32(dx)));
            (ry=C.i16(ry+C.i32(dy)));
            if(good_rm_wall_doorpos(rx,ry,dir,aroom)) {
                (C.cell(x,"short").value=rx);
                (C.cell(y,"short").value=ry);
                return (C.i8(1));
            }
            if(Number(!((Number(!!(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(rx)*(C.sizes["struct rm"]*21))+Number(ry)*C.sizes["struct rm"]),"rm","typ").value)==C.STONE)||Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(rx)*(C.sizes["struct rm"]*21))+Number(ry)*C.sizes["struct rm"]),"rm","typ").value)==C.CORR))))))) (fail=(C.i8(1)));
            if(Number(!!(Number(!!(Number(!!(Number(C.i32(rx)<C.i32(C.field(aroom,"mkroom","lx").value))||Number(C.i32(rx)>C.i32(C.field(aroom,"mkroom","hx").value))))||Number(C.i32(ry)<C.i32(C.field(aroom,"mkroom","ly").value))))||Number(C.i32(ry)>C.i32(C.field(aroom,"mkroom","hy").value))))) (fail=(C.i8(1)));
        }
    }
    return (C.i8(0));
}

/* find a valid door position at room edge.
   dir is the preferred edge of the room.
   if found, returns TRUE and the coordinate in cc */
export function finddpos(cc,dir,aroom)
{
    cc=C.ptr(cc);
    dir=C.i32(dir);
    aroom=C.ptr(aroom);
    const stackFrame=C.stackSave();
    try {
    let x=C.local("short",0); let y=C.local("short",0);
    let x1; let y1; let x2; let y2;
    let tryct=0;
    switch(dir) {
        case (C.DIR_N):
            (x1=C.field(aroom,"mkroom","lx").value);
        (x2=C.field(aroom,"mkroom","hx").value);
        (y1=C.i16(C.i32((C.i32(C.field(aroom,"mkroom","ly").value)-1))));
        (y2=C.i16(C.i32((C.i32(C.field(aroom,"mkroom","ly").value)-1))));
        break;
        case (C.DIR_S):
            (x1=C.field(aroom,"mkroom","lx").value);
        (x2=C.field(aroom,"mkroom","hx").value);
        (y1=C.i16(C.i32((C.i32(C.field(aroom,"mkroom","hy").value)+1))));
        (y2=C.i16(C.i32((C.i32(C.field(aroom,"mkroom","hy").value)+1))));
        break;
        case (C.DIR_W):
            (x1=C.i16(C.i32((C.i32(C.field(aroom,"mkroom","lx").value)-1))));
        (x2=C.i16(C.i32((C.i32(C.field(aroom,"mkroom","lx").value)-1))));
        (y1=C.field(aroom,"mkroom","ly").value);
        (y2=C.field(aroom,"mkroom","hy").value);
        break;
        case (C.DIR_E):
            (x1=C.i16(C.i32((C.i32(C.field(aroom,"mkroom","hx").value)+1))));
        (x2=C.i16(C.i32((C.i32(C.field(aroom,"mkroom","hx").value)+1))));
        (y1=C.field(aroom,"mkroom","ly").value);
        (y2=C.field(aroom,"mkroom","hy").value);
        break;
        default:
            C.variadic(0,C.literal("finddpos: illegal dir"));
        return (C.i8(0));
    }
    gotit: {
        /* try random points */
        do {
            (x.value=C.i16(((C.i32((C.i32(x2)-C.i32(x1))))?(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),185,(C.literal("finddpos"))),C.rn2(C.i32((C.i32((C.i32(x2)-C.i32(x1)))+1))))):C.rn2(C.i32((C.i32((C.i32(x2)-C.i32(x1)))+1)))))+C.i32((x1))))):C.i32(x1))));
            (y.value=C.i16(((C.i32((C.i32(y2)-C.i32(y1))))?(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),186,(C.literal("finddpos"))),C.rn2(C.i32((C.i32((C.i32(y2)-C.i32(y1)))+1))))):C.rn2(C.i32((C.i32((C.i32(y2)-C.i32(y1)))+1)))))+C.i32((y1))))):C.i32(y1))));
            if(finddpos_shift(x.address,y.address,dir,aroom)) break gotit; /* original goto gotit */
        } while(Number((tryct=C.i32((tryct+1)))<20));
        /* try all the points */
        for((x.value=x1);Number(C.i32(x.value)<=C.i32(x2));((x.value=C.i16((x.value+1)))-1)) for((y.value=y1);Number(C.i32(y.value)<=C.i32(y2));((y.value=C.i16((y.value+1)))-1)) if(finddpos_shift(x.address,y.address,dir,aroom)) break gotit; /* original goto gotit */


        /* cannot find something reasonable -- strange */
        (C.field(cc,"nhcoord","x").value=x1);
        (C.field(cc,"nhcoord","y").value=y1);
        return (C.i8(0));
    }
    (C.field(cc,"nhcoord","x").value=x.value);
    (C.field(cc,"nhcoord","y").value=y.value);
    return (C.i8(1));
    } finally {C.stackRestore(stackFrame); }
}

/* Sort rooms on the level so they're ordered from left to right on the map.
   makecorridors() by default links rooms N and N+1 */
export function sort_rooms()
{
    const stackFrame=C.stackSave();
    try {
    let x; let y;
    let i; let ri=C.stackAlloc((4*41)); C.initialize(ri,"unsigned int[41]",[]); let n=C.u32(C.field(C.svn,"instance_globals_saved_n","nroom").value);
    C.nh_deterministic_qsort((C.field(C.svr,"instance_globals_saved_r","rooms").address),C.u64((n)),(BigInt(C.sizes["struct mkroom"])),(C.ownedFunctionPointer("mkroom_cmp")));
    /* Update the roomnos on the map */
    for((i=C.u32(0));Number(i<n);((i=C.u32((i+1)))-1)) (C.cell((ri+Number(C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(i)*C.sizes["struct mkroom"]),"mkroom","roomnoidx").value)*4),"unsigned int").value=i);

    for((x=C.i16(1));Number(C.i32(x)<80);((x=C.i16((x+1)))-1)) for((y=C.i16(0));Number(C.i32(y)<21);((y=C.i16((y+1)))-1)) {
        let rno=C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","roomno").value;
        if(Number(!!(Number(rno>=C.u32(3))&&Number(rno<C.u32(C.i32((40+1))))))) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","roomno").value=C.u32((C.cell((ri+Number(C.u32((rno-C.u32(3))))*4),"unsigned int").value+C.u32(3))));
    }

    } finally {C.stackRestore(stackFrame); }
}

export function do_room_or_subroom(croom,lowx,lowy,hix,hiy,lit,rtype,special,is_room)
{
    croom=C.ptr(croom);
    lowx=C.i16(lowx);
    lowy=C.i16(lowy);
    hix=C.i16(hix);
    hiy=C.i16(hiy);
    lit=C.i8(lit);
    rtype=C.i8(rtype);
    special=C.i8(special);
    is_room=C.i8(is_room);
    let x; let y;
    let lev;
    /* locations might bump level edges in wall-less rooms */
    /* add/subtract 1 to allow for edge locations */
    if(Number(!(lowx))) ((lowx=C.i16((lowx+1)))-1);
    if(Number(!(lowy))) ((lowy=C.i16((lowy+1)))-1);
    if(Number(C.i32(hix)>=C.i32((80-1)))) (hix=C.i16(C.i32((80-2))));
    if(Number(C.i32(hiy)>=C.i32((21-1)))) (hiy=C.i16(C.i32((21-2))));
    if(lit) {
        for((x=C.i16(C.i32((C.i32(lowx)-1))));Number(C.i32(x)<=C.i32((C.i32(hix)+1)));((x=C.i16((x+1)))-1)) {
            (lev=((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(((Number((C.i32((C.i32(lowy)-1)))>(0))?(C.i32((C.i32(lowy)-1))):(0))))*C.sizes["struct rm"]));
            for((y=C.i16(C.i32((C.i32(lowy)-1))));Number(C.i32(y)<=C.i32((C.i32(hiy)+1)));((y=C.i16((y+1)))-1)) (C.field(((lev=C.ptr((lev+Number(C.sizes["struct rm"]))))-Number(C.sizes["struct rm"])),"rm","lit").value=C.u32(1));

        }
        (C.field(croom,"mkroom","rlit").value=C.i8(1));
    } else (C.field(croom,"mkroom","rlit").value=C.i8(0));
    (C.field(croom,"mkroom","roomnoidx").value=C.i8((C.i64(((croom-C.field(C.svr,"instance_globals_saved_r","rooms").address)/C.sizes["struct mkroom"])))));
    (C.field(croom,"mkroom","lx").value=lowx);
    (C.field(croom,"mkroom","hx").value=hix);
    (C.field(croom,"mkroom","ly").value=lowy);
    (C.field(croom,"mkroom","hy").value=hiy);
    (C.field(croom,"mkroom","rtype").value=rtype);
    (C.field(croom,"mkroom","doorct").value=C.i8(0));
    /* if we're not making a vault, gd.doorindex will still be 0
     * if we are, we'll have problems adding niches to the previous room
     * unless fdoor is at least gd.doorindex
     */
    (C.field(croom,"mkroom","fdoor").value=C.field(C.gd,"instance_globals_d","doorindex").value);
    (C.field(croom,"mkroom","irregular").value=(C.i8(0)));
    (C.field(croom,"mkroom","nsubrooms").value=C.i8(0));
    (C.cell((C.field(croom,"mkroom","sbrooms").address+Number(0)*8),"struct mkroom *").value=0);
    if(Number(!(special))) {
        (C.field(croom,"mkroom","needjoining").value=(C.i8(1)));
        for((x=C.i16(C.i32((C.i32(lowx)-1))));Number(C.i32(x)<=C.i32((C.i32(hix)+1)));((x=C.i16((x+1)))-1)) for((y=C.i16(C.i32((C.i32(lowy)-1))));Number(C.i32(y)<=C.i32((C.i32(hiy)+1)));(y=C.i16(y+(C.i32((C.i32((C.i32(hiy)-C.i32(lowy)))+2)))))) {
            (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value=C.i8(C.HWALL));
            (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","horizontal").value=C.u32(1));
            /* For open/secret doors. */
        }

        for((x=C.i16(C.i32((C.i32(lowx)-1))));Number(C.i32(x)<=C.i32((C.i32(hix)+1)));(x=C.i16(x+(C.i32((C.i32((C.i32(hix)-C.i32(lowx)))+2)))))) for((y=lowy);Number(C.i32(y)<=C.i32(hiy));((y=C.i16((y+1)))-1)) {
            (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value=C.i8(C.VWALL));
            (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","horizontal").value=C.u32(0));
            /* For open/secret doors. */
        }

        for((x=lowx);Number(C.i32(x)<=C.i32(hix));((x=C.i16((x+1)))-1)) {
            (lev=((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(lowy)*C.sizes["struct rm"]));
            for((y=lowy);Number(C.i32(y)<=C.i32(hiy));((y=C.i16((y+1)))-1)) (C.field(((lev=C.ptr((lev+Number(C.sizes["struct rm"]))))-Number(C.sizes["struct rm"])),"rm","typ").value=C.i8(C.ROOM));

        }
        if(is_room) {
            (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(lowx)-1)))*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(lowy)-1)))*C.sizes["struct rm"]),"rm","typ").value=C.i8(C.TLCORNER));
            (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(hix)+1)))*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(lowy)-1)))*C.sizes["struct rm"]),"rm","typ").value=C.i8(C.TRCORNER));
            (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(lowx)-1)))*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(hiy)+1)))*C.sizes["struct rm"]),"rm","typ").value=C.i8(C.BLCORNER));
            (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(hix)+1)))*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(hiy)+1)))*C.sizes["struct rm"]),"rm","typ").value=C.i8(C.BRCORNER));
        } else {
            /* a subroom */
            C.wallification(C.i16(C.i32((C.i32(lowx)-1))),C.i16(C.i32((C.i32(lowy)-1))),C.i16(C.i32((C.i32(hix)+1))),C.i16(C.i32((C.i32(hiy)+1))));
        }
    }
}

export function add_room(lowx,lowy,hix,hiy,lit,rtype,special)
{
    lowx=C.i16(lowx);
    lowy=C.i16(lowy);
    hix=C.i16(hix);
    hiy=C.i16(hiy);
    lit=C.i8(lit);
    rtype=C.i8(rtype);
    special=C.i8(special);
    let croom;
    if(Number(C.field(C.svn,"instance_globals_saved_n","nroom").value>=40)) C.variadic(1,C.literal("level has too many rooms"));
    /*DEBUG*/
    (croom=(C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(C.field(C.svn,"instance_globals_saved_n","nroom").value)*C.sizes["struct mkroom"]));
    do_room_or_subroom(croom,lowx,lowy,hix,hiy,lit,rtype,special,(C.i8(1)));
    ((croom=C.ptr((croom+Number(C.sizes["struct mkroom"]))))-Number(C.sizes["struct mkroom"]));
    (C.field(croom,"mkroom","hx").value=C.i16(C.i32((-1))));
    ((C.field(C.svn,"instance_globals_saved_n","nroom").value=C.i32((C.field(C.svn,"instance_globals_saved_n","nroom").value+1)))-1);
}

export function add_subroom(proom,lowx,lowy,hix,hiy,lit,rtype,special)
{
    proom=C.ptr(proom);
    lowx=C.i16(lowx);
    lowy=C.i16(lowy);
    hix=C.i16(hix);
    hiy=C.i16(hiy);
    lit=C.i8(lit);
    rtype=C.i8(rtype);
    special=C.i8(special);
    let croom;
    if(Number(C.field(C.gn,"instance_globals_n","nsubroom").value>=40)) C.variadic(2,C.literal("level has too many subrooms"));
    if(Number(C.i32(C.field(proom,"mkroom","nsubrooms").value)>=24)) C.variadic(3,C.literal("room has too many subrooms"));
    /*DEBUG*/
    (croom=(C.field(C.gs,"instance_globals_s","subrooms").value+Number(C.field(C.gn,"instance_globals_n","nsubroom").value)*C.sizes["struct mkroom"]));
    do_room_or_subroom(croom,lowx,lowy,hix,hiy,lit,rtype,special,(C.i8(0)));
    (C.cell((C.field(proom,"mkroom","sbrooms").address+Number(((C.field(proom,"mkroom","nsubrooms").value=C.i8((C.field(proom,"mkroom","nsubrooms").value+1)))-1))*8),"struct mkroom *").value=croom);
    ((croom=C.ptr((croom+Number(C.sizes["struct mkroom"]))))-Number(C.sizes["struct mkroom"]));
    (C.field(croom,"mkroom","hx").value=C.i16(C.i32((-1))));
    ((C.field(C.gn,"instance_globals_n","nsubroom").value=C.i32((C.field(C.gn,"instance_globals_n","nsubroom").value+1)))-1);
}

export function free_luathemes(theme_group)
{
    let i;
    /*
     * Release which group(s)?
     *  tut_themes  => leaving tutorial, free tutorial themes only;
     *  most_themes => entering endgame, free non-endgame themes;
     *  all_themes  => end of game, free all themes.
     */
    for((i=0);Number(i<C.field(C.svn,"instance_globals_saved_n","n_dgns").value);(i=C.i32((i+1)))) {
        if(Number(!!((Number(!!(Number(C.u32(theme_group)==C.u32(C.tut_themes))&&Number(i!=C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_tutorial_dnum").value))))))||(Number(!!(Number(C.u32(theme_group)==C.u32(C.most_themes))&&Number(i==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_astral_level").address,"d_level","dnum").value)))))))) continue;
        if(C.cell((C.field(C.gl,"instance_globals_l","luathemes").address+Number(i)*8),"void *").value) {
            C.nhl_done(C.cell((C.field(C.gl,"instance_globals_l","luathemes").address+Number(i)*8),"void *").value);
            (C.cell((C.field(C.gl,"instance_globals_l","luathemes").address+Number(i)*8),"void *").value=0);
        }
    }
}

export function makerooms()
{
    const stackFrame=C.stackSave();
    try {
    let tried_vault=(C.i8(0));
    let themeroom_tries=0;
    let fname;
    let sbi=C.stackAlloc(C.sizes["struct nhl_sandbox_info"]); C.initialize(sbi,"struct nhl_sandbox_info",[2147483648,C.u32(C.i32((C.i32((1*1024))*1024))),C.u32(0),C.u32(C.i32((C.i32((1*1024))*1024)))]);
    let themes=C.cell((C.field(C.gl,"instance_globals_l","luathemes").address+Number(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value)*8),"void *").value;
    if(Number(!!(Number(!(themes))&&C.i32(C.cell(((fname=C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value)*C.sizes["struct dungeon"]),"dungeon","themerms").address)),"char").value)))) {
        if(Number(((themes=C.nhl_init(sbi)))!=0)) {
            if(Number(!(C.nhl_loadlua(themes,fname)))) {
                /* loading lua failed, don't use themed rooms */
                C.nhl_done(themes);
                (themes=0);
            } else {
                /* success; save state for this dungeon branch */
                (C.cell((C.field(C.gl,"instance_globals_l","luathemes").address+Number(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value)*8),"void *").value=themes);
                /* keep themes context, so not 'nhl_done(themes);' */
                (C.field(C.iflags,"instance_flags","in_lua").value=(C.i8(0)));
                /* can affect error messages */
            }
        }
        if(Number(!(themes))) (C.cell(fname,"char").value=C.i8(0));
        /* don't try again when making next level */
        /* svd.dungeons[u.uz.dnum].themerms */
    }
    if(themes) {
        C.create_des_coder();
        (C.field(C.iflags,"instance_flags","in_lua").value=(C.field(C.gi,"instance_globals_i","in_mk_themerooms").value=(C.i8(1))));
        (C.field(C.gt,"instance_globals_t","themeroom_failed").value=(C.i8(0)));
        C.lua_getglobal(themes,C.literal("pre_themerooms_generate"));
        C.nhl_pcall_handle(themes,0,0,C.literal("makerooms-1"),C.i32(C.NHLpa_impossible));
        (C.field(C.iflags,"instance_flags","in_lua").value=(C.field(C.gi,"instance_globals_i","in_mk_themerooms").value=(C.i8(0))));
    }
    /* make rooms until satisfied */
    /* rnd_rect() will returns 0 if no more rects are available... */
    while(Number(!!(Number(C.field(C.svn,"instance_globals_saved_n","nroom").value<(C.i32((40-1))))&&C.rnd_rect()))) {
        if(Number(!!(Number(!!(Number(C.field(C.svn,"instance_globals_saved_n","nroom").value>=(C.i32(Math.trunc((40/6)))))&&((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),404,(C.literal("makerooms"))),C.rn2(2))):C.rn2(2)))))&&Number(!(tried_vault))))) {
            (tried_vault=(C.i8(1)));
            if(C.create_room(C.i16(C.i32((-1))),C.i16(C.i32((-1))),C.i16(2),C.i16(2),C.i16(C.i32((-1))),C.i16(C.i32((-1))),C.i16(C.VAULT),C.i16((C.i8(1))))) {
                (C.field(C.gv,"instance_globals_v","vault_x").value=C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(C.field(C.svn,"instance_globals_saved_n","nroom").value)*C.sizes["struct mkroom"]),"mkroom","lx").value);
                (C.field(C.gv,"instance_globals_v","vault_y").value=C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(C.field(C.svn,"instance_globals_saved_n","nroom").value)*C.sizes["struct mkroom"]),"mkroom","ly").value);
                (C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(C.field(C.svn,"instance_globals_saved_n","nroom").value)*C.sizes["struct mkroom"]),"mkroom","hx").value=C.i16(C.i32((-1))));
            }
        } else {
            if(themes) {
                (C.field(C.iflags,"instance_flags","in_lua").value=(C.field(C.gi,"instance_globals_i","in_mk_themerooms").value=(C.i8(1))));
                (C.field(C.gt,"instance_globals_t","themeroom_failed").value=(C.i8(0)));
                C.lua_getglobal(themes,C.literal("themerooms_generate"));
                C.nhl_pcall_handle(themes,0,0,C.literal("makerooms-2"),C.i32(C.NHLpa_panic));
                (C.field(C.iflags,"instance_flags","in_lua").value=(C.field(C.gi,"instance_globals_i","in_mk_themerooms").value=(C.i8(0))));
                if(Number(!!(C.i32(C.field(C.gt,"instance_globals_t","themeroom_failed").value)&&(Number(!!((Number(((themeroom_tries=C.i32((themeroom_tries+1)))-1)>10))||(Number(C.field(C.svn,"instance_globals_saved_n","nroom").value>=(C.i32(Math.trunc((40/6)))))))))))) break;
            } else {
                if(Number(!(C.create_room(C.i16(C.i32((-1))),C.i16(C.i32((-1))),C.i16(C.i32((-1))),C.i16(C.i32((-1))),C.i16(C.i32((-1))),C.i16(C.i32((-1))),C.i16(C.OROOM),C.i16(C.i32((-1))))))) break;
                ;
            }
        }
    }
    if(themes) {
        C.reset_xystart_size();
        (C.field(C.iflags,"instance_flags","in_lua").value=(C.field(C.gi,"instance_globals_i","in_mk_themerooms").value=(C.i8(1))));
        (C.field(C.gt,"instance_globals_t","themeroom_failed").value=(C.i8(0)));
        C.lua_getglobal(themes,C.literal("post_themerooms_generate"));
        C.nhl_pcall_handle(themes,0,0,C.literal("makerooms-3"),C.i32(C.NHLpa_panic));
        (C.field(C.iflags,"instance_flags","in_lua").value=(C.field(C.gi,"instance_globals_i","in_mk_themerooms").value=(C.i8(0))));
    }
    } finally {C.stackRestore(stackFrame); }
}

export function join(a,b,nxcor)
{
    a=C.i32(a);
    b=C.i32(b);
    nxcor=C.i8(nxcor);
    const stackFrame=C.stackSave();
    try {
    let cc=C.stackAlloc(C.sizes["struct nhcoord"]); let tt=C.stackAlloc(C.sizes["struct nhcoord"]); let org=C.stackAlloc(C.sizes["struct nhcoord"]); let dest=C.stackAlloc(C.sizes["struct nhcoord"]);
    let tx; let ty; let xx; let yy;
    let croom; let troom;
    let dx; let dy;
    let npoints=C.local("int",0);
    let dig_result;
    (croom=(C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(a)*C.sizes["struct mkroom"]));
    (troom=(C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(b)*C.sizes["struct mkroom"]));
    if(Number(!!(Number(!(C.field(croom,"mkroom","needjoining").value))||Number(!(C.field(troom,"mkroom","needjoining").value))))) return;
    /* find positions cc and tt for doors in croom and troom
       and direction for a corridor between them */
    if(Number(!!(Number(C.i32(C.field(troom,"mkroom","hx").value)<0)||Number(C.i32(C.field(croom,"mkroom","hx").value)<0)))) return;
    if(Number(C.i32(C.field(troom,"mkroom","lx").value)>C.i32(C.field(croom,"mkroom","hx").value))) {
        (dx=1);
        (dy=0);
        if(Number(!(finddpos(cc,C.DIR_E,croom)))) return;
        if(Number(!(finddpos(tt,C.DIR_W,troom)))) return;
    } else if(Number(C.i32(C.field(troom,"mkroom","hy").value)<C.i32(C.field(croom,"mkroom","ly").value))) {
        (dy=C.i32((-1)));
        (dx=0);
        if(Number(!(finddpos(cc,C.DIR_N,croom)))) return;
        if(Number(!(finddpos(tt,C.DIR_S,troom)))) return;
    } else if(Number(C.i32(C.field(troom,"mkroom","hx").value)<C.i32(C.field(croom,"mkroom","lx").value))) {
        (dx=C.i32((-1)));
        (dy=0);
        if(Number(!(finddpos(cc,C.DIR_W,croom)))) return;
        if(Number(!(finddpos(tt,C.DIR_E,troom)))) return;
    } else {
        (dy=1);
        (dx=0);
        if(Number(!(finddpos(cc,C.DIR_S,croom)))) return;
        if(Number(!(finddpos(tt,C.DIR_N,troom)))) return;
    }
    (xx=C.field(cc,"nhcoord","x").value);
    (yy=C.field(cc,"nhcoord","y").value);
    (tx=C.i16(C.i32((C.i32(C.field(tt,"nhcoord","x").value)-dx))));
    (ty=C.i16(C.i32((C.i32(C.field(tt,"nhcoord","y").value)-dy))));
    if(Number(!!(C.i32(nxcor)&&Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(xx)+dx)))*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(yy)+dy)))*C.sizes["struct rm"]),"rm","typ").value)!=C.STONE)))) return;
    (C.field(org,"nhcoord","x").value=C.i16(C.i32((C.i32(xx)+dx))));
    (C.field(org,"nhcoord","y").value=C.i16(C.i32((C.i32(yy)+dy))));
    (C.field(dest,"nhcoord","x").value=tx);
    (C.field(dest,"nhcoord","y").value=ty);
    (dig_result=C.dig_corridor(org,dest,npoints.address,nxcor,C.i8((C.i32(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","arboreal").value)?C.ROOM:C.CORR)),C.i8(C.STONE)));
    /* we created at least 1 tile of corridor, even if it failed */
    if(Number(!!((Number(npoints.value>0))&&(Number(!!(okdoor(xx,yy)||Number(!(nxcor)))))))) dodoor(xx,yy,croom);
    if(Number(!(dig_result))) return;
    /* we succeeded in digging the corridor */
    if(Number(!!(okdoor(C.field(tt,"nhcoord","x").value,C.field(tt,"nhcoord","y").value)||Number(!(nxcor))))) dodoor(C.field(tt,"nhcoord","x").value,C.field(tt,"nhcoord","y").value,troom);
    if(Number(C.cell((C.field(C.gs,"instance_globals_s","smeq").address+Number(a)*4),"int").value<C.cell((C.field(C.gs,"instance_globals_s","smeq").address+Number(b)*4),"int").value)) (C.cell((C.field(C.gs,"instance_globals_s","smeq").address+Number(b)*4),"int").value=C.cell((C.field(C.gs,"instance_globals_s","smeq").address+Number(a)*4),"int").value);
 else (C.cell((C.field(C.gs,"instance_globals_s","smeq").address+Number(a)*4),"int").value=C.cell((C.field(C.gs,"instance_globals_s","smeq").address+Number(b)*4),"int").value);
    } finally {C.stackRestore(stackFrame); }
}

/* create random corridors between rooms */
export function makecorridors()
{
    let a; let b; let i;
    let any=(C.i8(1));
    for((a=0);Number(a<C.i32((C.field(C.svn,"instance_globals_saved_n","nroom").value-1)));((a=C.i32((a+1)))-1)) {
        join(a,C.i32((a+1)),(C.i8(0)));
        if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),529,(C.literal("makecorridors"))),C.rn2(50))):C.rn2(50)))))) break;
        /* allow some randomness */
    }
    for((a=0);Number(a<C.i32((C.field(C.svn,"instance_globals_saved_n","nroom").value-2)));((a=C.i32((a+1)))-1)) if(Number(C.cell((C.field(C.gs,"instance_globals_s","smeq").address+Number(a)*4),"int").value!=C.cell((C.field(C.gs,"instance_globals_s","smeq").address+Number(C.i32((a+2)))*4),"int").value)) join(a,C.i32((a+2)),(C.i8(0)));

    for((a=0);Number(!!(C.i32(any)&&Number(a<C.field(C.svn,"instance_globals_saved_n","nroom").value)));((a=C.i32((a+1)))-1)) {
        (any=(C.i8(0)));
        for((b=0);Number(b<C.field(C.svn,"instance_globals_saved_n","nroom").value);((b=C.i32((b+1)))-1)) if(Number(C.cell((C.field(C.gs,"instance_globals_s","smeq").address+Number(a)*4),"int").value!=C.cell((C.field(C.gs,"instance_globals_s","smeq").address+Number(b)*4),"int").value)) {
            join(a,b,(C.i8(0)));
            (any=(C.i8(1)));
        }

    }
    /* add some extra corridors which may be blocked off */
    if(Number(C.field(C.svn,"instance_globals_saved_n","nroom").value>2)) for((i=C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),545,(C.literal("makecorridors"))),C.rn2(C.field(C.svn,"instance_globals_saved_n","nroom").value))):C.rn2(C.field(C.svn,"instance_globals_saved_n","nroom").value)))+4)));i;((i=C.i32((i-1)))+1)) {
        (a=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),546,(C.literal("makecorridors"))),C.rn2(C.field(C.svn,"instance_globals_saved_n","nroom").value))):C.rn2(C.field(C.svn,"instance_globals_saved_n","nroom").value))));
        (b=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),547,(C.literal("makecorridors"))),C.rn2(C.i32((C.field(C.svn,"instance_globals_saved_n","nroom").value-2))))):C.rn2(C.i32((C.field(C.svn,"instance_globals_saved_n","nroom").value-2))))));
        if(Number(b>=a)) (b=C.i32(b+2));
        join(a,b,(C.i8(1)));
    }
}

/* (re)allocate space for svd.doors array */
export function alloc_doors()
{
    if(Number(!!(Number(!(C.field(C.svd,"instance_globals_saved_d","doors").value))||Number(C.field(C.gd,"instance_globals_d","doorindex").value>=C.field(C.svd,"instance_globals_saved_d","doors_alloc").value)))) {
        let c=C.i32((C.field(C.svd,"instance_globals_saved_d","doors_alloc").value+20));
        let doortmp=C.alloc(C.u32(C.u64((C.u64(c)*BigInt(C.sizes["struct nhcoord"])))));
        C.memset(doortmp,0,C.u64((C.u64(c)*BigInt(C.sizes["struct nhcoord"]))));
        if(C.field(C.svd,"instance_globals_saved_d","doors").value) {
            C.memcpy(doortmp,C.field(C.svd,"instance_globals_saved_d","doors").value,C.u64((C.u64(C.field(C.svd,"instance_globals_saved_d","doors_alloc").value)*BigInt(C.sizes["struct nhcoord"]))));
            C.free(C.field(C.svd,"instance_globals_saved_d","doors").value);
        }
        (C.field(C.svd,"instance_globals_saved_d","doors").value=doortmp);
        (C.field(C.svd,"instance_globals_saved_d","doors_alloc").value=c);
    }
}

export function add_door(x,y,aroom)
{
    x=C.i16(x);
    y=C.i16(y);
    aroom=C.ptr(aroom);
    let broom;
    let tmp;
    let i;
    alloc_doors();
    if(C.field(aroom,"mkroom","doorct").value) {
        for((i=0);Number(i<C.i32(C.field(aroom,"mkroom","doorct").value));((i=C.i32((i+1)))-1)) {
            (tmp=C.i32((C.field(aroom,"mkroom","fdoor").value+i)));
            if(Number(!!(Number(C.i32(C.field((C.field(C.svd,"instance_globals_saved_d","doors").value+Number(tmp)*C.sizes["struct nhcoord"]),"nhcoord","x").value)==C.i32(x))&&Number(C.i32(C.field((C.field(C.svd,"instance_globals_saved_d","doors").value+Number(tmp)*C.sizes["struct nhcoord"]),"nhcoord","y").value)==C.i32(y))))) return;
        }
    }
    if(Number(C.i32(C.field(aroom,"mkroom","doorct").value)==0)) (C.field(aroom,"mkroom","fdoor").value=C.field(C.gd,"instance_globals_d","doorindex").value);
    ((C.field(aroom,"mkroom","doorct").value=C.i8((C.field(aroom,"mkroom","doorct").value+1)))-1);
    for((tmp=C.field(C.gd,"instance_globals_d","doorindex").value);Number(tmp>C.field(aroom,"mkroom","fdoor").value);((tmp=C.i32((tmp-1)))+1)) C.copy((C.field(C.svd,"instance_globals_saved_d","doors").value+Number(tmp)*C.sizes["struct nhcoord"]),(C.field(C.svd,"instance_globals_saved_d","doors").value+Number(C.i32((tmp-1)))*C.sizes["struct nhcoord"]),C.sizes["struct nhcoord"]);

    for((i=0);Number(i<C.field(C.svn,"instance_globals_saved_n","nroom").value);((i=C.i32((i+1)))-1)) {
        (broom=(C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(i)*C.sizes["struct mkroom"]));
        if(Number(!!(Number(!!(Number(broom!=aroom)&&C.i32(C.field(broom,"mkroom","doorct").value)))&&Number(C.field(broom,"mkroom","fdoor").value>=C.field(aroom,"mkroom","fdoor").value)))) ((C.field(broom,"mkroom","fdoor").value=C.i32((C.field(broom,"mkroom","fdoor").value+1)))-1);
    }
    for((i=0);Number(i<C.field(C.gn,"instance_globals_n","nsubroom").value);((i=C.i32((i+1)))-1)) {
        (broom=(C.field(C.gs,"instance_globals_s","subrooms").value+Number(i)*C.sizes["struct mkroom"]));
        if(Number(!!(Number(!!(Number(broom!=aroom)&&C.i32(C.field(broom,"mkroom","doorct").value)))&&Number(C.field(broom,"mkroom","fdoor").value>=C.field(aroom,"mkroom","fdoor").value)))) ((C.field(broom,"mkroom","fdoor").value=C.i32((C.field(broom,"mkroom","fdoor").value+1)))-1);
    }
    ((C.field(C.gd,"instance_globals_d","doorindex").value=C.i32((C.field(C.gd,"instance_globals_d","doorindex").value+1)))-1);
    (C.field((C.field(C.svd,"instance_globals_saved_d","doors").value+Number(C.field(aroom,"mkroom","fdoor").value)*C.sizes["struct nhcoord"]),"nhcoord","x").value=x);
    (C.field((C.field(C.svd,"instance_globals_saved_d","doors").value+Number(C.field(aroom,"mkroom","fdoor").value)*C.sizes["struct nhcoord"]),"nhcoord","y").value=y);
}

export function dosdoor(x,y,aroom,type)
{
    x=C.i16(x);
    y=C.i16(y);
    aroom=C.ptr(aroom);
    type=C.i32(type);
    let shdoor=C.i8((C.i32(C.cell(C.in_rooms(x,y,C.SHOPBASE),"char").value)?C.i32((C.i8(1))):C.i32((C.i8(0)))));
    if(Number(!((Number(!!(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))&&Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))<=C.DBWALL))))))) (type=C.DOOR);
    /* avoid S.doors on already made doors */
    (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value=C.i8(type));
    if(Number(type==C.DOOR)) {
        if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),623,(C.literal("dosdoor"))),C.rn2(3))):C.rn2(3)))))) {
            /* is it a locked door, closed, or a doorway? */
            if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),624,(C.literal("dosdoor"))),C.rn2(5))):C.rn2(5)))))) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value=C.u32(2));
 else if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),626,(C.literal("dosdoor"))),C.rn2(6))):C.rn2(6)))))) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value=C.u32(8));
 else (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value=C.u32(4));
            if(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value)!=2)&&Number(!(shdoor))))&&Number(C.i32(C.level_difficulty())>=5)))&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),632,(C.literal("dosdoor"))),C.rn2(25))):C.rn2(25)))))))) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value=C.u32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value|16));
        } else {
            (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value=C.u32(((C.i32(shdoor)?2:0))));
        }
        /* also done in roguecorr(); doing it here first prevents
           making mimics in place of trapped doors on rogue svl.level */
        if(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address))))))) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value=C.u32(0));
        if(C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value)&16))) {
            let mtmp;
            if(Number(!!(Number(!!(Number(C.i32(C.level_difficulty())>=9)&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),653,(C.literal("dosdoor"))),C.rn2(5))):C.rn2(5)))))))&&Number(!((Number(!!(Number(!!((C.i32((C.i32(C.field((C.field(C.svm,"instance_globals_saved_m","mvitals").address+Number(C.PM_SMALL_MIMIC)*C.sizes["struct mvitals"]),"mvitals","mvflags").value)&(C.i32((2|1))))))&&(C.i32((C.i32(C.field((C.field(C.svm,"instance_globals_saved_m","mvitals").address+Number(C.PM_LARGE_MIMIC)*C.sizes["struct mvitals"]),"mvitals","mvflags").value)&(C.i32((2|1))))))))&&(C.i32((C.i32(C.field((C.field(C.svm,"instance_globals_saved_m","mvitals").address+Number(C.PM_GIANT_MIMIC)*C.sizes["struct mvitals"]),"mvitals","mvflags").value)&(C.i32((2|1)))))))))))))) {
                /* make a mimic instead */
                (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value=C.u32(0));
                (mtmp=C.makemon(C.mkclass(C.i8(C.S_MIMIC),0),x,y,C.u32(0n)));
                if(mtmp) C.set_mimic_sym(mtmp);
            }
        }
        /* newsym(x,y); */
    } else {
        /* SDOOR */
        if(Number(!!(C.i32(shdoor)||Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),666,(C.literal("dosdoor"))),C.rn2(5))):C.rn2(5)))))))) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value=C.u32(8));
 else (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value=C.u32(4));
        if(Number(!!(Number(!!(Number(!(shdoor))&&Number(C.i32(C.level_difficulty())>=4)))&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),671,(C.literal("dosdoor"))),C.rn2(20))):C.rn2(20)))))))) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value=C.u32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value|16));
    }
    add_door(x,y,aroom);
}

/* is x,y location such that NEWS direction from it is inside aroom,
   excluding subrooms */
export function cardinal_nextto_room(aroom,x,y)
{
    aroom=C.ptr(aroom);
    x=C.i16(x);
    y=C.i16(y);
    let rmno=C.i32((C.i64(((C.i64(((aroom-C.field(C.svr,"instance_globals_saved_r","rooms").address)/C.sizes["struct mkroom"])))+C.i64(3)))));
    if(Number(!!(Number(!!(C.isok(C.i16(C.i32((C.i32(x)-1))),y)&&Number(!(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(x)-1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","edge").value))))&&Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(x)-1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","roomno").value)==rmno)))) return (C.i8(1));
    if(Number(!!(Number(!!(C.isok(C.i16(C.i32((C.i32(x)+1))),y)&&Number(!(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(x)+1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","edge").value))))&&Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(x)+1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","roomno").value)==rmno)))) return (C.i8(1));
    if(Number(!!(Number(!!(C.isok(x,C.i16(C.i32((C.i32(y)-1))))&&Number(!(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(y)-1)))*C.sizes["struct rm"]),"rm","edge").value))))&&Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(y)-1)))*C.sizes["struct rm"]),"rm","roomno").value)==rmno)))) return (C.i8(1));
    if(Number(!!(Number(!!(C.isok(x,C.i16(C.i32((C.i32(y)+1))))&&Number(!(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(y)+1)))*C.sizes["struct rm"]),"rm","edge").value))))&&Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(y)+1)))*C.sizes["struct rm"]),"rm","roomno").value)==rmno)))) return (C.i8(1));
    return (C.i8(0));
}

export function place_niche(aroom,dy,xx,yy)
{
    aroom=C.ptr(aroom);
    dy=C.ptr(dy);
    xx=C.ptr(xx);
    yy=C.ptr(yy);
    const stackFrame=C.stackSave();
    try {
    let dd=C.stackAlloc(C.sizes["struct nhcoord"]);
    if(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),708,(C.literal("place_niche"))),C.rn2(2))):C.rn2(2)))) {
        (C.cell(dy,"int").value=1);
        if(Number(!(finddpos(dd,C.DIR_S,aroom)))) return (C.i8(0));
    } else {
        (C.cell(dy,"int").value=C.i32((-1)));
        if(Number(!(finddpos(dd,C.DIR_N,aroom)))) return (C.i8(0));
    }
    (C.cell(xx,"short").value=C.field(dd,"nhcoord","x").value);
    (C.cell(yy,"short").value=C.field(dd,"nhcoord","y").value);
    return C.i8((Number(!!(Number(!!((Number(!!(C.isok(C.cell(xx,"short").value,C.i16(C.i32((C.i32(C.cell(yy,"short").value)+C.cell(dy,"int").value))))&&Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xx,"short").value)*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(C.cell(yy,"short").value)+C.cell(dy,"int").value)))*C.sizes["struct rm"]),"rm","typ").value)==C.STONE))))&&(Number(!!(Number(!!(C.isok(C.cell(xx,"short").value,C.i16(C.i32((C.i32(C.cell(yy,"short").value)-C.cell(dy,"int").value))))&&Number(!((Number(!!(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xx,"short").value)*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(C.cell(yy,"short").value)-C.cell(dy,"int").value)))*C.sizes["struct rm"]),"rm","typ").value))>=C.POOL)&&Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xx,"short").value)*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(C.cell(yy,"short").value)-C.cell(dy,"int").value)))*C.sizes["struct rm"]),"rm","typ").value))<=C.DRAWBRIDGE_UP))))))))&&Number(!((Number(!!(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xx,"short").value)*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(C.cell(yy,"short").value)-C.cell(dy,"int").value)))*C.sizes["struct rm"]),"rm","typ").value))>=C.STAIRS)&&Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(xx,"short").value)*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(C.cell(yy,"short").value)-C.cell(dy,"int").value)))*C.sizes["struct rm"]),"rm","typ").value))<=C.ALTAR)))))))))))&&C.i32(cardinal_nextto_room(aroom,C.cell(xx,"short").value,C.cell(yy,"short").value))))));
    } finally {C.stackRestore(stackFrame); }
}

/* there should be one of these per trap, in the same order as trap.h */
/* 14..16: trap door, teleport, level-teleport */
/* 24..25 */
export function makeniche(trap_type)
{
    trap_type=C.i32(trap_type);
    const stackFrame=C.stackSave();
    try {
    let aroom;
    let rm;
    let dy=C.local("int",0); let vct=8;
    let xx=C.local("short",0); let yy=C.local("short",0);
    let ttmp;
    while(((vct=C.i32((vct-1)))+1)) {
        (aroom=(C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),749,(C.literal("makeniche"))),C.rn2(C.field(C.svn,"instance_globals_saved_n","nroom").value))):C.rn2(C.field(C.svn,"instance_globals_saved_n","nroom").value))))*C.sizes["struct mkroom"]));
        if(Number(C.i32(C.field(aroom,"mkroom","rtype").value)!=C.OROOM)) continue;
        /* not an ordinary room */
        if(Number(!!(Number(C.i32(C.field(aroom,"mkroom","doorct").value)==1)&&((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),752,(C.literal("makeniche"))),C.rn2(5))):C.rn2(5)))))) continue;
        if(Number(!(place_niche(aroom,dy.address,xx.address,yy.address)))) continue;
        (rm=((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(xx.value)*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(yy.value)+dy.value)))*C.sizes["struct rm"]));
        if(Number(!!(trap_type||Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),758,(C.literal("makeniche"))),C.rn2(4))):C.rn2(4)))))))) {
            (C.field(rm,"rm","typ").value=C.i8(C.SCORR));
            if(trap_type) {
                if(Number(!!((Number(!!(Number((trap_type)==C.HOLE)||Number((trap_type)==C.TRAPDOOR))))&&Number(!(C.Can_fall_thru(C.field(C.u,"you","uz").address)))))) (trap_type=C.ROCKTRAP);
                (ttmp=C.maketrap(xx.value,C.i16(C.i32((C.i32(yy.value)+dy.value))),trap_type));
                if(ttmp) {
                    if(Number(trap_type!=C.ROCKTRAP)) (C.field(ttmp,"trap","once").value=C.u32(1));
                    if(C.cell((C.staticAddress("trap_engravings")+Number(trap_type)*8),"char *").value) {
                        C.make_engr_at(xx.value,C.i16(C.i32((C.i32(yy.value)-dy.value))),C.cell((C.staticAddress("trap_engravings")+Number(trap_type)*8),"char *").value,0,0n,1);
                        C.wipe_engr_at(xx.value,C.i16(C.i32((C.i32(yy.value)-dy.value))),C.i16(5),(C.i8(0)));
                        /* age it a little */
                    }
                }
            }
            dosdoor(xx.value,yy.value,aroom,C.SDOOR);
        } else {
            (C.field(rm,"rm","typ").value=C.i8(C.CORR));
            if(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),779,(C.literal("makeniche"))),C.rn2(7))):C.rn2(7)))) {
                dosdoor(xx.value,yy.value,aroom,(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),780,(C.literal("makeniche"))),C.rn2(5))):C.rn2(5)))?C.SDOOR:C.DOOR));
            } else {
                /* inaccessible niches occasionally have iron bars */
                if(Number(!!(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),783,(C.literal("makeniche"))),C.rn2(5))):C.rn2(5)))))&&(Number(!!(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(xx.value)*(C.sizes["struct rm"]*21))+Number(yy.value)*C.sizes["struct rm"]),"rm","typ").value))&&Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(xx.value)*(C.sizes["struct rm"]*21))+Number(yy.value)*C.sizes["struct rm"]),"rm","typ").value))<=C.DBWALL))))))) {
                    C.set_levltyp(xx.value,yy.value,C.i8(C.IRONBARS));
                    if(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),785,(C.literal("makeniche"))),C.rn2(3))):C.rn2(3)))) C.mkcorpstat(C.CORPSE,0,C.mkclass(C.i8(C.S_HUMAN),0),xx.value,C.i16(C.i32((C.i32(yy.value)+dy.value))),C.u32((C.i8(1))));
                }
                if(Number(!(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","noteleport").value))) C.mksobj_at(C.SCR_TELEPORTATION,xx.value,C.i16(C.i32((C.i32(yy.value)+dy.value))),(C.i8(1)),(C.i8(0)));
                if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),793,(C.literal("makeniche"))),C.rn2(3))):C.rn2(3)))))) C.mkobj_at(C.i8(C.RANDOM_CLASS),xx.value,C.i16(C.i32((C.i32(yy.value)+dy.value))),(C.i8(1)));
            }
        }
        return;
    }
    } finally {C.stackRestore(stackFrame); }
}

export function make_niches()
{
    let ct=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),804,(C.literal("make_niches"))),C.rnd(C.i32(((C.i32((C.field(C.svn,"instance_globals_saved_n","nroom").value>>1)))+1))))):C.rnd(C.i32(((C.i32((C.field(C.svn,"instance_globals_saved_n","nroom").value>>1)))+1))))); let dep=C.i32(C.depth(C.field(C.u,"you","uz").address));
    let ltptr=C.i8((Number(!!(Number(!(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","noteleport").value))&&Number(dep>15))))); let vamp=C.i8((Number(!!(Number(dep>5)&&Number(dep<25)))));
    while(((ct=C.i32((ct-1)))+1)) {
        if(Number(!!(C.i32(ltptr)&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),809,(C.literal("make_niches"))),C.rn2(6))):C.rn2(6)))))))) {
            (ltptr=(C.i8(0)));
            makeniche(C.LEVEL_TELEP);
        } else if(Number(!!(C.i32(vamp)&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),812,(C.literal("make_niches"))),C.rn2(6))):C.rn2(6)))))))) {
            (vamp=(C.i8(0)));
            makeniche(C.TRAPDOOR);
        } else makeniche(C.NO_TRAP);
    }
}

export function makevtele()
{
    makeniche(C.TELEP_TRAP);
}

/* count the tracked features (sinks, fountains) present on the level */
export function count_level_features()
{
    let x; let y;
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","nfountains").value=(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","nsinks").value=C.u8(0)));
    for((y=C.i16(0));Number(C.i32(y)<21);((y=C.i16((y+1)))-1)) for((x=C.i16(1));Number(C.i32(x)<80);((x=C.i16((x+1)))-1)) {
        let typ=C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value);
        if(Number(typ==C.FOUNTAIN)) ((C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","nfountains").value=C.u8((C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","nfountains").value+1)))-1);
 else if(Number(typ==C.SINK)) ((C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","nsinks").value=C.u8((C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","nsinks").value+1)))-1);
    }

}

/* clear out various globals that keep information on the current level.
 * some of this is only necessary for some types of levels (maze, normal,
 * special) but it's easier to put it all in one place than make sure
 * each type initializes what it needs to separately.
 */
export function clear_level_structures()
{
    
    let x; let y;
    let lev;
    /* note:  normally we'd start at x=1 because map column #0 isn't used
       (except for placing vault guard at <0,0> when removed from the map
       but not from the level); explicitly reset column #0 along with the
       rest so that we start the new level with a completely clean slate */
    for((x=C.i16(0));Number(C.i32(x)<80);((x=C.i16((x+1)))-1)) {
        (lev=((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(0)*C.sizes["struct rm"]));
        for((y=C.i16(0));Number(C.i32(y)<21);((y=C.i16((y+1)))-1)) {
            C.copy(((lev=C.ptr((lev+Number(C.sizes["struct rm"]))))-Number(C.sizes["struct rm"])),C.staticAddress("zerorm"),C.sizes["struct rm"]);
            (C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8),"struct obj *").value=0);
            (C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value=0);
        }
    }
    (C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objlist").value=0);
    (C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","buriedobjlist").value=0);
    (C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value=0);
    (C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","damagelist").value=0);
    (C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","bonesinfo").value=0);
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","nfountains").value=C.u8(0));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","nsinks").value=C.u8(0));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","has_shop").value=C.u32(0));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","has_vault").value=C.u32(0));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","has_zoo").value=C.u32(0));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","has_court").value=C.u32(0));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","has_morgue").value=(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","graveyard").value=C.u32(0)));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","has_beehive").value=C.u32(0));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","has_barracks").value=C.u32(0));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","has_temple").value=C.u32(0));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","has_swamp").value=C.u32(0));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","noteleport").value=C.u32(0));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","hardfloor").value=C.u32(0));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","nommap").value=C.u32(0));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","hero_memory").value=C.u32(1));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","shortsighted").value=C.u32(0));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","sokoban_rules").value=C.u32(0));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","is_maze_lev").value=C.u32(0));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","is_cavernous_lev").value=C.u32(0));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","arboreal").value=C.u32(0));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","has_town").value=C.u32(0));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","wizard_bones").value=C.u32(0));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","corrmaze").value=C.u32(0));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","temperature").value=C.i8((C.i32(C.In_hell(C.field(C.u,"you","uz").address))?1:0)));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","rndmongen").value=C.u32(1));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","deathdrops").value=C.u32(1));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","noautosearch").value=C.u32(0));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","fumaroles").value=C.u32(0));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","stormy").value=C.u32(0));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","stasis_until").value=0n);
    (C.field(C.svn,"instance_globals_saved_n","nroom").value=0);
    (C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(0)*C.sizes["struct mkroom"]),"mkroom","hx").value=C.i16(C.i32((-1))));
    (C.field(C.gn,"instance_globals_n","nsubroom").value=0);
    (C.field((C.field(C.gs,"instance_globals_s","subrooms").value+Number(0)*C.sizes["struct mkroom"]),"mkroom","hx").value=C.i16(C.i32((-1))));
    (C.field(C.gd,"instance_globals_d","doorindex").value=0);
    if(C.field(C.svd,"instance_globals_saved_d","doors_alloc").value) {
        C.free(C.field(C.svd,"instance_globals_saved_d","doors").value);
        (C.field(C.svd,"instance_globals_saved_d","doors").value=0);
        (C.field(C.svd,"instance_globals_saved_d","doors_alloc").value=0);
    }
    C.init_rect();
    (C.field(C.gv,"instance_globals_v","vault_x").value=C.i16(C.i32((-1))));
    C.stairway_free_all();
    (C.field(C.gm,"instance_globals_m","made_branch").value=(C.i8(0)));
    C.clear_regions();
    C.free_exclusions();
    C.reset_xystart_size();
    if(C.field(C.gl,"instance_globals_l","lev_message").value) {
        C.free(C.field(C.gl,"instance_globals_l","lev_message").value);
        (C.field(C.gl,"instance_globals_l","lev_message").value=0);
    }
}

/* Fill a "random" room (i.e. a typical non-special room in the Dungeons of
   Doom) with random monsters, objects, and dungeon features.

   If bonus_items is TRUE, there may be an additional special item
   generated, depending on depth. */
export function fill_ordinary_room(croom,bonus_items)
{
    croom=C.ptr(croom);
    bonus_items=C.i8(bonus_items);
    const stackFrame=C.stackSave();
    try {
    let trycnt=0;
    let pos=C.stackAlloc(C.sizes["struct nhcoord"]);
    let tmonst;
    /* always put a web with a spider */
    let x; let y;
    let skip_chests=(C.i8(0));
    if(Number(!!(Number(C.i32(C.field(croom,"mkroom","rtype").value)!=C.OROOM)&&Number(C.i32(C.field(croom,"mkroom","rtype").value)!=C.THEMEROOM)))) return;
    /* If there are subrooms, fill them now - we don't want an outer room
     * that's specified to be unfilled to block an inner subroom that's
     * specified to be filled. */
    for((x=C.i16(0));Number(C.i32(x)<C.i32(C.field(croom,"mkroom","nsubrooms").value));(x=C.i16((x+1)))) {
        let subroom=C.cell((C.field(croom,"mkroom","sbrooms").address+Number(x)*8),"struct mkroom *").value;
        if(Number(!(subroom))) {
            C.variadic(4,C.literal("fill_ordinary_room: Null subroom"));
            return;
        }
        fill_ordinary_room(subroom,(C.i8(0)));
    }
    if(Number(C.i32(C.field(croom,"mkroom","needfill").value)!=1)) return;
    /* put a sleeping monster inside */
    /* Note: monster may be on the stairs. This cannot be
       avoided: maybe the player fell through a trap door
       while a monster was on the stairs. Conclusion:
       we have to check for monsters on the stairs anyway. */
    if(Number(!!((Number(!!(C.i32(C.field(C.field(C.u,"you","uhave").address,"u_have","amulet").value)||Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),974,(C.literal("fill_ordinary_room"))),C.rn2(3))):C.rn2(3))))))))&&C.i32(C.somexyspace(croom,pos))))) {
        (tmonst=C.makemon(0,C.field(pos,"nhcoord","x").value,C.field(pos,"nhcoord","y").value,C.u32(8192n)));
        if(Number(!!(Number(!!(tmonst&&Number(C.field(tmonst,"monst","data").value==(C.mons+Number(C.PM_GIANT_SPIDER)*C.sizes["struct permonst"]))))&&Number(!(occupied(C.field(pos,"nhcoord","x").value,C.field(pos,"nhcoord","y").value)))))) C.maketrap(C.field(pos,"nhcoord","x").value,C.field(pos,"nhcoord","y").value,C.WEB);
    }
    /* put traps and mimics inside */
    (x=C.i16(C.i32((8-(C.i32(Math.trunc((C.i32(C.level_difficulty())/6))))))));
    if(Number(C.i32(x)<=1)) (x=C.i16(2));
    while(Number(!!(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),984,(C.literal("fill_ordinary_room"))),C.rn2(C.i32(x)))):C.rn2(C.i32(x))))))&&(Number((trycnt=C.i32((trycnt+1)))<1000))))) mktrap(0,0,croom,0);

    if(Number(!!(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),986,(C.literal("fill_ordinary_room"))),C.rn2(3))):C.rn2(3)))))&&C.i32(C.somexyspace(croom,pos))))) C.mkgold(0n,C.field(pos,"nhcoord","x").value,C.field(pos,"nhcoord","y").value);
    skip_nonrogue: {
        if(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address))))))) break skip_nonrogue; /* original goto skip_nonrogue */
        if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),990,(C.literal("fill_ordinary_room"))),C.rn2(10))):C.rn2(10)))))) mkfount(croom);
        if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),992,(C.literal("fill_ordinary_room"))),C.rn2(60))):C.rn2(60)))))) mksink(croom);
        if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),994,(C.literal("fill_ordinary_room"))),C.rn2(60))):C.rn2(60)))))) mkaltar(croom);
        (x=C.i16(C.i32((80-(C.i32((C.i32(C.depth(C.field(C.u,"you","uz").address))*2)))))));
        if(Number(C.i32(x)<2)) (x=C.i16(2));
        if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),999,(C.literal("fill_ordinary_room"))),C.rn2(C.i32(x)))):C.rn2(C.i32(x))))))) mkgrave(croom);
        /* put statues inside */
        if(Number(!!(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1003,(C.literal("fill_ordinary_room"))),C.rn2(20))):C.rn2(20)))))&&C.i32(C.somexyspace(croom,pos))))) C.mkcorpstat(C.STATUE,0,0,C.field(pos,"nhcoord","x").value,C.field(pos,"nhcoord","y").value,C.u32(8));
        /*
     * bonus_items means that this is the room where the bonus item
     * should be placed, if there is one; but there might not be a
     * bonus item on any given level.
     *
     * Bonus items are currently as follows:
     * a) on the Mines branch level, 100% chance of a fairly filling
     *    comestible;
     * b) on other levels above the Oracle, 2/3 chance of a "supply
     *    chest" that contains an early-game survivability item
     *    (there are therefore more of these when Sokoban is deep,
     *    which is intentional as those games are harder).
     * This mechanism could be expanded in the future to place
     * near-guaranteed items on particular levels (but, it is possible
     * that no room will be given a bonus item if there is no suitable
     * room to place it in, so it should not be used for plot-critical
     * items).
     */
        if(Number(!!(C.i32(bonus_items)&&C.i32(C.somexyspace(croom,pos))))) {
            let uz_branch=C.Is_branchlev(C.field(C.u,"you","uz").address);
            if(Number(!!(Number(!!(uz_branch&&Number(C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value)!=C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_mines_dnum").value)))))&&(Number(!!(Number(C.i32(C.field(C.field(uz_branch,"branch","end1").address,"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_mines_dnum").value)))||Number(C.i32(C.field(C.field(uz_branch,"branch","end2").address,"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_mines_dnum").value))))))))) {
                C.mksobj_at(((Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1032,(C.literal("fill_ordinary_room"))),C.rn2(5))):C.rn2(5)))<3))?C.FOOD_RATION:(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1033,(C.literal("fill_ordinary_room"))),C.rn2(2))):C.rn2(2)))?C.CRAM_RATION:C.LEMBAS_WAFER)),C.field(pos,"nhcoord","x").value,C.field(pos,"nhcoord","y").value,(C.i8(1)),(C.i8(0)));
            } else if(Number(!!(Number(!!(Number(C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value)==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_oracle_level").address,"d_level","dnum").value))&&Number(C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dlevel").value)<C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_oracle_level").address,"d_level","dlevel").value))))&&((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1037,(C.literal("fill_ordinary_room"))),C.rn2(3))):C.rn2(3)))))) {
                let otmp;
                let otyp; let tryct=0;
                let cursed;
                /* reverse probabilities compared to non-supply chests;
               these are twice as likely to be chests than large
               boxes, rather than vice versa */
                let supply_chest=C.mksobj_at((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1044,(C.literal("fill_ordinary_room"))),C.rn2(3))):C.rn2(3)))?C.CHEST:C.LARGE_BOX),C.field(pos,"nhcoord","x").value,C.field(pos,"nhcoord","y").value,(C.i8(0)),(C.i8(0)));
                (C.field(supply_chest,"obj","olocked").value=C.u32(Number(!(Number(!((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1047,(C.literal("fill_ordinary_room"))),C.rn2(6))):C.rn2(6))))))))));
                do {
                    
                    /* 50% this is a potion of healing */
                    (otyp=(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1063,(C.literal("fill_ordinary_room"))),C.rn2(2))):C.rn2(2)))?C.POT_HEALING:C.cell((C.staticAddress("supply_items")+Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1063,(C.literal("fill_ordinary_room"))),C.rn2(C.i32((C.u64((BigInt((4*9))/BigInt(4)))))))):C.rn2(C.i32((C.u64((BigInt((4*9))/BigInt(4)))))))))*4),"int").value));
                    (otmp=C.mksobj(otyp,(C.i8(1)),(C.i8(0))));
                    if(Number(!!(Number(otyp==C.POT_HEALING)&&((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1065,(C.literal("fill_ordinary_room"))),C.rn2(2))):C.rn2(2)))))) {
                        (C.field(otmp,"obj","quan").value=C.i64(2));
                        (C.field(otmp,"obj","owt").value=C.u32(C.weight(otmp)));
                    }
                    (cursed=C.i8(C.field(otmp,"obj","cursed").value));
                    C.add_to_container(supply_chest,otmp);
                    /* owt updated below */
                    (tryct=C.i32((tryct+1)));
                    if(Number(tryct==50)) {
                        C.variadic(5,C.literal("couldn't generate supply chest item"));
                        break;
                    }
                    /* guarantee at least one noncursed item, with a small
                   probability of more; if we generate a cursed item, it's
                   added to the supply chest but we reroll for a noncursed
                   item and add that too */
                } while(Number(!!(C.i32(cursed)||Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1081,(C.literal("fill_ordinary_room"))),C.rn2(5))):C.rn2(5))))))));
                /* maybe put a random item into the supply chest, biased
               slightly towards low-level spellbooks; avoid tools
               because chests don't fit into other chests */
                if(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1086,(C.literal("fill_ordinary_room"))),C.rn2(3))):C.rn2(3)))) {
                    
                    let oclass=C.cell((C.staticAddress("extra_classes")+Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1099,(C.literal("fill_ordinary_room"))),C.rn2(C.i32((C.u64((BigInt((4*10))/BigInt(4)))))))):C.rn2(C.i32((C.u64((BigInt((4*10))/BigInt(4)))))))))*4),"int").value;
                    (otmp=C.mkobj(oclass,(C.i8(0))));
                    if(Number(oclass==(C.i32((0-C.SPBOOK_CLASS))))) {
                        let pass; let maxpass=((Number(C.i32(C.depth(C.field(C.u,"you","uz").address))>2))?2:3);
                        /* bias towards lower level by generating again
                       and taking the lower-level book; do that three
                       times if on level 1 or 2, twice when deeper */
                        for((pass=1);Number(pass<=maxpass);(pass=C.i32((pass+1)))) {
                            let otmp2=C.mkobj(oclass,(C.i8(0)));
                            if(Number(C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_oc2").value)<=C.i32(C.field((C.objects+Number(C.field(otmp2,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_oc2").value))) {
                                C.dealloc_obj(otmp2);
                            } else {
                                C.dealloc_obj(otmp);
                                (otmp=otmp2);
                            }
                        }
                    }
                    C.add_to_container(supply_chest,otmp);
                    /* owt updated below */
                }
                /* add_to_container() doesn't update the container's weight */
                (C.field(supply_chest,"obj","owt").value=C.u32(C.weight(supply_chest)));
                (skip_chests=(C.i8(1)));
                /* don't want a second chest in this room */
            }
        }
        /* put box/chest inside;
     *  40% chance for at least 1 box, regardless of number
     *  of rooms; about 5 - 7.5% for 2 boxes, least likely
     *  when few rooms; chance for 3 or more is negligible.
     */
        /*assert(svn.nroom > 0); // must be true because we're filling a room*/
        if(Number(!!(Number(!!(Number(!(skip_chests))&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1137,(C.literal("fill_ordinary_room"))),C.rn2(C.i32(Math.trunc((C.i32((C.field(C.svn,"instance_globals_saved_n","nroom").value*5))/2)))))):C.rn2(C.i32(Math.trunc((C.i32((C.field(C.svn,"instance_globals_saved_n","nroom").value*5))/2))))))))))&&C.i32(C.somexyspace(croom,pos))))) C.mksobj_at((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1138,(C.literal("fill_ordinary_room"))),C.rn2(3))):C.rn2(3)))?C.LARGE_BOX:C.CHEST),C.field(pos,"nhcoord","x").value,C.field(pos,"nhcoord","y").value,(C.i8(1)),(C.i8(0)));
        /* maybe make some graffiti */
        if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1142,(C.literal("fill_ordinary_room"))),C.rn2(C.i32((27+C.i32((3*C.abs(C.i32(C.depth(C.field(C.u,"you","uz").address)))))))))):C.rn2(C.i32((27+C.i32((3*C.abs(C.i32(C.depth(C.field(C.u,"you","uz").address))))))))))))) {
            let buf=C.stackAlloc((1*256)); let pristinebuf=C.stackAlloc((1*256));
            let mesg=C.random_engraving(buf,pristinebuf);
            if(mesg) {
                do {
                    C.somexyspace(croom,pos);
                    (x=C.field(pos,"nhcoord","x").value);
                    (y=C.field(pos,"nhcoord","y").value);
                } while(Number(!!(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)!=C.ROOM)&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1151,(C.literal("fill_ordinary_room"))),C.rn2(40))):C.rn2(40))))))));
                if(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.ROOM)) C.make_engr_at(x,y,mesg,pristinebuf,0n,4);
            }
        }
    }
    if(Number(!!(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1158,(C.literal("fill_ordinary_room"))),C.rn2(3))):C.rn2(3)))))&&C.i32(C.somexyspace(croom,pos))))) {
        C.mkobj_at(C.i8(C.RANDOM_CLASS),C.field(pos,"nhcoord","x").value,C.field(pos,"nhcoord","y").value,(C.i8(1)));
        (trycnt=0);
        while(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1161,(C.literal("fill_ordinary_room"))),C.rn2(5))):C.rn2(5)))))) {
            if(Number((trycnt=C.i32((trycnt+1)))>100)) {
                C.variadic(6,C.literal("trycnt overflow4"));
                break;
            }
            if(C.somexyspace(croom,pos)) {
                C.mkobj_at(C.i8(C.RANDOM_CLASS),C.field(pos,"nhcoord","x").value,C.field(pos,"nhcoord","y").value,(C.i8(1)));
            }
        }
    }
    } finally {C.stackRestore(stackFrame); }
}

export function themerooms_post_level_generate()
{
    let themes=C.cell((C.field(C.gl,"instance_globals_l","luathemes").address+Number(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value)*8),"void *").value;
    /* themes should already be loaded by makerooms();
      * if not, we don't run this either */
    if(Number(!(themes))) return;
    C.reset_xystart_size();
    (C.field(C.iflags,"instance_flags","in_lua").value=(C.field(C.gi,"instance_globals_i","in_mk_themerooms").value=(C.i8(1))));
    (C.field(C.gt,"instance_globals_t","themeroom_failed").value=(C.i8(0)));
    C.lua_getglobal(themes,C.literal("post_level_generate"));
    C.nhl_pcall_handle(themes,0,0,C.literal("post_level_generate"),C.i32(C.NHLpa_panic));
    (C.field(C.iflags,"instance_flags","in_lua").value=(C.field(C.gi,"instance_globals_i","in_mk_themerooms").value=(C.i8(0))));
    C.wallification(C.i16(1),C.i16(0),C.i16(C.i32((80-1))),C.i16(C.i32((21-1))));
    if(C.field(C.gc,"instance_globals_c","coder").value) (C.free(C.field(C.gc,"instance_globals_c","coder").value),(C.field(C.gc,"instance_globals_c","coder").value=0));
    C.variadic(7,themes,2);
}

/* if x,y is door, does it open into solid terrain */
export function chk_okdoor(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    if((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))==C.DOOR))) {
        if(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","horizontal").value) {
            if(Number(!!((Number(!!(C.isok(x,C.i16(C.i32((C.i32(y)-1))))&&(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(y)-1)))*C.sizes["struct rm"]),"rm","typ").value)>C.TREE)))))&&(Number(!!(C.isok(x,C.i16(C.i32((C.i32(y)+1))))&&(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(y)+1)))*C.sizes["struct rm"]),"rm","typ").value)<=C.TREE)))))))) return (C.i8(0));
            if(Number(!!((Number(!!(C.isok(x,C.i16(C.i32((C.i32(y)-1))))&&(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(y)-1)))*C.sizes["struct rm"]),"rm","typ").value)<=C.TREE)))))&&(Number(!!(C.isok(x,C.i16(C.i32((C.i32(y)+1))))&&(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(y)+1)))*C.sizes["struct rm"]),"rm","typ").value)>C.TREE)))))))) return (C.i8(0));
        } else {
            if(Number(!!((Number(!!(C.isok(C.i16(C.i32((C.i32(x)-1))),y)&&(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(x)-1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)>C.TREE)))))&&(Number(!!(C.isok(C.i16(C.i32((C.i32(x)+1))),y)&&(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(x)+1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)<=C.TREE)))))))) return (C.i8(0));
            if(Number(!!((Number(!!(C.isok(C.i16(C.i32((C.i32(x)-1))),y)&&(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(x)-1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)<=C.TREE)))))&&(Number(!!(C.isok(C.i16(C.i32((C.i32(x)+1))),y)&&(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(x)+1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)>C.TREE)))))))) return (C.i8(0));
        }
        return (C.i8(1));
    }
    return (C.i8(1));
}

/* check mklev created level sanity */
export function mklev_sanity_check()
{
    let x; let y;
    let i;
    let rmno=C.i32((-1));
    if(Number(!((Number(!!(C.i32(C.field(C.iflags,"instance_flags","sanity_check").value)||C.i32(C.field(C.iflags,"instance_flags","debug_fuzzer").value))))))) return;
    for((y=C.i16(0));Number(C.i32(y)<21);((y=C.i16((y+1)))-1)) {
        for((x=C.i16(1));Number(C.i32(x)<80);((x=C.i16((x+1)))-1)) {
            if(Number(!(chk_okdoor(x,y)))) C.variadic(8,C.literal("levl[%i][%i] door not ok"),C.i32(x),C.i32(y));
        }
    }
    for((i=0);Number(i<C.field(C.svn,"instance_globals_saved_n","nroom").value);((i=C.i32((i+1)))-1)) {
        if(Number(!(C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(i)*C.sizes["struct mkroom"]),"mkroom","needjoining").value))) continue;
        if(Number(rmno==C.i32((-1)))) (rmno=C.cell((C.field(C.gs,"instance_globals_s","smeq").address+Number(i)*4),"int").value);
        if(Number(!!(Number(rmno!=C.i32((-1)))&&Number(C.cell((C.field(C.gs,"instance_globals_s","smeq").address+Number(i)*4),"int").value!=rmno)))) C.variadic(9,C.literal("room %i not connected?"),i);
    }
}

export function makelevel()
{
    const stackFrame=C.stackSave();
    try {
    let croom;
    let branchp;
    let prevstairs;
    let room_threshold;
    let slev;
    let i;
    if(Number(C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_wiz1_level").address,"d_level","dlevel").value)==0)) {
        C.variadic(10,C.literal("makelevel() called when dungeon not yet initialized."));
        C.init_dungeons();
    }
    C.oinit();
    /* assign level dependent obj probabilities */
    clear_level_structures();
    (slev=C.Is_special(C.field(C.u,"you","uz").address));
    /* check for special levels */
    if(Number(!!(slev&&Number(!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address))))))))))) {
        C.makemaz(C.field(slev,"s_level","proto").address);
    } else if(C.cell((C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value)*C.sizes["struct dungeon"]),"dungeon","proto").address+Number(0)*1),"char").value) {
        C.makemaz(C.literal(""));
    } else if(C.cell((C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value)*C.sizes["struct dungeon"]),"dungeon","fill_lvl").address+Number(0)*1),"char").value) {
        C.makemaz(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value)*C.sizes["struct dungeon"]),"dungeon","fill_lvl").address);
    } else if(C.In_quest(C.field(C.u,"you","uz").address)) {
        let fillname=C.stackAlloc((1*9));
        let loc_lev;
        C.variadic(11,fillname,C.literal("%s-loca"),C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","filecode").value);
        (loc_lev=C.find_level(fillname));
        C.variadic(12,fillname,C.literal("%s-fil"),C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","filecode").value);
        C.strcat(fillname,((Number(C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dlevel").value)<C.i32(C.field(C.field(loc_lev,"s_level","dlevel").address,"d_level","dlevel").value)))?C.literal("a"):C.literal("b")));
        C.makemaz(fillname);
    } else if(Number(!!(C.i32(C.In_hell(C.field(C.u,"you","uz").address))||(Number(!!(Number(!!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1287,(C.literal("makelevel"))),C.rn2(5))):C.rn2(5)))&&Number(C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value)==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_medusa_level").address,"d_level","dnum").value))))&&Number(C.i32(C.depth(C.field(C.u,"you","uz").address))>C.i32(C.depth(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_medusa_level").address))))))))) {
        C.makemaz(C.literal(""));
    } else {
        /* otherwise, fall through - it's a "regular" level. */
        let u_depth=C.i32(C.depth(C.field(C.u,"you","uz").address));
        if(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address))))))) {
            C.makeroguerooms();
            C.makerogueghost();
        } else {
            makerooms();
        }
        ((Number(!!((Number(C.field(C.svn,"instance_globals_saved_n","nroom").value>0))||((C.__assert_fail(C.literal("svn.nroom > 0"),C.literal("mklev.c"),1300,(C.literal("makelevel"))),0))))));
        sort_rooms();
        generate_stairs();
        /* up and down stairs */
        (branchp=C.Is_branchlev(C.field(C.u,"you","uz").address));
        /* possible dungeon branch */
        (room_threshold=(branchp?4:3));
        skip0: {
            /* minimum number of rooms needed
                                            to allow a random special room */
            if(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address))))))) break skip0; /* original goto skip0 */
            makecorridors();
            make_niches();
            mklev_sanity_check();
            /* make a secret treasure vault, not connected to the rest */
            if((Number(C.i32(C.field(C.gv,"instance_globals_v","vault_x").value)!=C.i32((-1))))) {
                let w=C.local("short",0); let h=C.local("short",0);
                do {
                    if(C.debugcore(C.literal("mklev.c"),(C.i8(1)))) {
                        let save_plnmsg=C.field(C.iflags,"instance_flags","last_msg").value;
                        C.variadic(13,C.literal("trying to make a vault..."));
                        (C.field(C.iflags,"instance_flags","last_msg").value=save_plnmsg);
                    }
                } while(0);
                (w.value=C.i16(1));
                (h.value=C.i16(1));
                vault_exit: {
                    fill_vault: {
                        if(C.check_room(C.field(C.gv,"instance_globals_v","vault_x").address,w.address,C.field(C.gv,"instance_globals_v","vault_y").address,h.address,(C.i8(1)))) break fill_vault;
                        if(Number(!!(C.rnd_rect()&&C.i32(C.create_room(C.i16(C.i32((-1))),C.i16(C.i32((-1))),C.i16(2),C.i16(2),C.i16(C.i32((-1))),C.i16(C.i32((-1))),C.i16(C.VAULT),C.i16((C.i8(1)))))))) {
                            (C.field(C.gv,"instance_globals_v","vault_x").value=C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(C.field(C.svn,"instance_globals_saved_n","nroom").value)*C.sizes["struct mkroom"]),"mkroom","lx").value);
                            (C.field(C.gv,"instance_globals_v","vault_y").value=C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(C.field(C.svn,"instance_globals_saved_n","nroom").value)*C.sizes["struct mkroom"]),"mkroom","ly").value);
                            if(C.check_room(C.field(C.gv,"instance_globals_v","vault_x").address,w.address,C.field(C.gv,"instance_globals_v","vault_y").address,h.address,(C.i8(1)))) break fill_vault; /* original goto fill_vault */
 else (C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(C.field(C.svn,"instance_globals_saved_n","nroom").value)*C.sizes["struct mkroom"]),"mkroom","hx").value=C.i16(C.i32((-1))));
                        }
                        break vault_exit;
                    }
                    add_room(C.field(C.gv,"instance_globals_v","vault_x").value,C.field(C.gv,"instance_globals_v","vault_y").value,C.i16(C.i32((C.i32(C.field(C.gv,"instance_globals_v","vault_x").value)+C.i32(w.value)))),C.i16(C.i32((C.i32(C.field(C.gv,"instance_globals_v","vault_y").value)+C.i32(h.value)))),(C.i8(1)),C.i8(C.VAULT),(C.i8(0)));
                    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","has_vault").value=C.u32(1));
                    (room_threshold=C.i32((room_threshold+1)));
                    (C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(C.i32((C.field(C.svn,"instance_globals_saved_n","nroom").value-1)))*C.sizes["struct mkroom"]),"mkroom","needfill").value=C.i8(1));
                    C.fill_special_room((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(C.i32((C.field(C.svn,"instance_globals_saved_n","nroom").value-1)))*C.sizes["struct mkroom"]));
                    mk_knox_portal(C.i16(C.i32((C.i32(C.field(C.gv,"instance_globals_v","vault_x").value)+C.i32(w.value)))),C.i16(C.i32((C.i32(C.field(C.gv,"instance_globals_v","vault_y").value)+C.i32(h.value)))));
                    if(Number(!!(Number(!(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","noteleport").value))&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1332,(C.literal("makelevel"))),C.rn2(3))):C.rn2(3)))))))) makevtele();
                }
            }
            /* make up to 1 special room, with type dependent on depth;
           note that mkroom doesn't guarantee a room gets created, and that
           this step only sets the room's rtype - it doesn't fill it yet. */
            if(Number(!!(C.i32(C.field(C.flags,"flag","debug").value)&&C.nh_getenv(C.literal("SHOPTYPE"))))) C.do_mkroom(C.SHOPBASE);
 else if(Number(!!(Number(!!(Number(!!(Number(u_depth>1)&&Number(u_depth<C.i32(C.depth(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_medusa_level").address)))))&&Number(C.field(C.svn,"instance_globals_saved_n","nroom").value>=room_threshold)))&&Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1350,(C.literal("makelevel"))),C.rn2(u_depth))):C.rn2(u_depth)))<3)))) C.do_mkroom(C.SHOPBASE);
 else if(Number(!!(Number(u_depth>4)&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1352,(C.literal("makelevel"))),C.rn2(6))):C.rn2(6)))))))) C.do_mkroom(C.COURT);
 else if(Number(!!(Number(!!(Number(u_depth>5)&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1354,(C.literal("makelevel"))),C.rn2(8))):C.rn2(8)))))))&&Number(!((C.i32((C.i32(C.field((C.field(C.svm,"instance_globals_saved_m","mvitals").address+Number(C.PM_LEPRECHAUN)*C.sizes["struct mvitals"]),"mvitals","mvflags").value)&(C.i32((2|1))))))))))) C.do_mkroom(C.LEPREHALL);
 else if(Number(!!(Number(u_depth>6)&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1357,(C.literal("makelevel"))),C.rn2(7))):C.rn2(7)))))))) C.do_mkroom(C.ZOO);
 else if(Number(!!(Number(u_depth>8)&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1359,(C.literal("makelevel"))),C.rn2(5))):C.rn2(5)))))))) C.do_mkroom(C.TEMPLE);
 else if(Number(!!(Number(!!(Number(u_depth>9)&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1361,(C.literal("makelevel"))),C.rn2(5))):C.rn2(5)))))))&&Number(!((C.i32((C.i32(C.field((C.field(C.svm,"instance_globals_saved_m","mvitals").address+Number(C.PM_KILLER_BEE)*C.sizes["struct mvitals"]),"mvitals","mvflags").value)&(C.i32((2|1))))))))))) C.do_mkroom(C.BEEHIVE);
 else if(Number(!!(Number(u_depth>11)&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1364,(C.literal("makelevel"))),C.rn2(6))):C.rn2(6)))))))) C.do_mkroom(C.MORGUE);
 else if(Number(!!(Number(!!(Number(u_depth>12)&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1366,(C.literal("makelevel"))),C.rn2(8))):C.rn2(8)))))))&&C.antholemon()))) C.do_mkroom(C.ANTHOLE);
 else if(Number(!!(Number(!!(Number(u_depth>14)&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1368,(C.literal("makelevel"))),C.rn2(4))):C.rn2(4)))))))&&Number(!((C.i32((C.i32(C.field((C.field(C.svm,"instance_globals_saved_m","mvitals").address+Number(C.PM_SOLDIER)*C.sizes["struct mvitals"]),"mvitals","mvflags").value)&(C.i32((2|1))))))))))) C.do_mkroom(C.BARRACKS);
 else if(Number(!!(Number(u_depth>15)&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1371,(C.literal("makelevel"))),C.rn2(6))):C.rn2(6)))))))) C.do_mkroom(C.SWAMP);
 else if(Number(!!(Number(!!(Number(u_depth>16)&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1373,(C.literal("makelevel"))),C.rn2(8))):C.rn2(8)))))))&&Number(!((C.i32((C.i32(C.field((C.field(C.svm,"instance_globals_saved_m","mvitals").address+Number(C.PM_COCKATRICE)*C.sizes["struct mvitals"]),"mvitals","mvflags").value)&(C.i32((2|1))))))))))) C.do_mkroom(C.COCKNEST);
        }
        (prevstairs=C.field(C.gs,"instance_globals_s","stairs").value);
        /* used to test for place_branch() success */
        /* Place multi-dungeon branch. */
        place_branch(branchp,C.i16(0),C.i16(0));
        /* for main dungeon level 1, the stairs up where the hero starts
           are branch stairs; treat them as if hero had just come down
           them by marking them as having been traversed; most recently
           created stairway is held in 'gs.stairs' */
        if(Number(!!(Number(!!(Number(C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value)==0)&&Number(C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dlevel").value)==1)))&&Number(C.field(C.gs,"instance_globals_s","stairs").value!=prevstairs)))) (C.field(C.field(C.gs,"instance_globals_s","stairs").value,"stairway","u_traversed").value=(C.i8(1)));
        /* some levels have specially generated items in ordinary
           rooms (intended to be indistinguishable from the normally
           generated items); work out which room these will be placed in */
        let fillable_room_count=0;
        for((croom=C.field(C.svr,"instance_globals_saved_r","rooms").address);Number(C.i32(C.field(croom,"mkroom","hx").value)>0);((croom=C.ptr((croom+Number(C.sizes["struct mkroom"]))))-Number(C.sizes["struct mkroom"]))) {
            if((Number(!!((Number(!!(Number(C.i32(C.field(croom,"mkroom","rtype").value)==C.OROOM)||Number(C.i32(C.field(croom,"mkroom","rtype").value)==C.THEMEROOM))))&&Number(C.i32(C.field(croom,"mkroom","needfill").value)==1))))) ((fillable_room_count=C.i32((fillable_room_count+1)))-1);
        }
        /* choose a random fillable room to be the one that gets the
           bonus items, if there are any; if there aren't any we don't
           generate the bonus items (but levels with no fillable rooms
           typically don't have any bonus items to generate anyway) */
        let bonus_item_room_countdown=(fillable_room_count?((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1402,(C.literal("makelevel"))),C.rn2(fillable_room_count))):C.rn2(fillable_room_count))):C.i32((-1)));
        /* for each room: put things inside */
        for((croom=C.field(C.svr,"instance_globals_saved_r","rooms").address);Number(C.i32(C.field(croom,"mkroom","hx").value)>0);((croom=C.ptr((croom+Number(C.sizes["struct mkroom"]))))-Number(C.sizes["struct mkroom"]))) {
            let fillable=C.i8((Number(!!((Number(!!(Number(C.i32(C.field(croom,"mkroom","rtype").value)==C.OROOM)||Number(C.i32(C.field(croom,"mkroom","rtype").value)==C.THEMEROOM))))&&Number(C.i32(C.field(croom,"mkroom","needfill").value)==1)))));
            fill_ordinary_room(croom,C.i8(Number(!!(C.i32(fillable)&&Number(bonus_item_room_countdown==0)))));
            if(fillable) (bonus_item_room_countdown=C.i32((bonus_item_room_countdown-1)));
        }
    }
    /* Fill all special rooms now, regardless of whether this is a special
     * level, proto level, or ordinary level. */
    for((i=0);Number(i<C.field(C.svn,"instance_globals_saved_n","nroom").value);(i=C.i32((i+1)))) {
        C.fill_special_room((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(i)*C.sizes["struct mkroom"]));
    }
    themerooms_post_level_generate();
    if(Number(!!(C.field(C.gl,"instance_globals_l","luacore").value&&C.cell((C.nhcb_counts+Number(C.NHCB_LVL_ENTER)*4),"int").value))) {
        C.lua_getglobal(C.field(C.gl,"instance_globals_l","luacore").value,C.literal("nh_callback_run"));
        C.lua_pushstring(C.field(C.gl,"instance_globals_l","luacore").value,C.cell((C.nhcb_name+Number(C.NHCB_LVL_ENTER)*8),"char *").value);
        C.nhl_pcall_handle(C.field(C.gl,"instance_globals_l","luacore").value,1,0,C.literal("makelevel"),C.i32(C.NHLpa_panic));
        C.lua_settop(C.field(C.gl,"instance_globals_l","luacore").value,0);
    }
    } finally {C.stackRestore(stackFrame); }
}

/* return TRUE if water location at (x,y) should have kelp. */
export function water_has_kelp(x,y,kelp_pool,kelp_moat)
{
    x=C.i16(x);
    y=C.i16(y);
    kelp_pool=C.i32(kelp_pool);
    kelp_moat=C.i32(kelp_moat);
    if(Number(!!((Number(!!(Number(!!(kelp_pool&&(Number(!!(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.POOL)||(Number(!!(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.WATER)&&Number(!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address))))))))))))))))&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1436,(C.literal("water_has_kelp"))),C.rn2(kelp_pool))):C.rn2(kelp_pool))))))))||(Number(!!(Number(!!(kelp_moat&&Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.MOAT)))&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1437,(C.literal("water_has_kelp"))),C.rn2(kelp_moat))):C.rn2(kelp_moat))))))))))) return (C.i8(1));
    return (C.i8(0));
}

/*
 *      Place deposits of minerals (gold and misc gems) in the stone
 *      surrounding the rooms on the map.
 *      Also place kelp in water.
 *      mineralize(-1, -1, -1, -1, FALSE); => "default" behavior
 */
export function mineralize(kelp_pool,kelp_moat,goldprob,gemprob,skip_lvl_checks)
{
    kelp_pool=C.i32(kelp_pool);
    kelp_moat=C.i32(kelp_moat);
    goldprob=C.i32(goldprob);
    gemprob=C.i32(gemprob);
    skip_lvl_checks=C.i8(skip_lvl_checks);
    let sp;
    let otmp;
    let x; let y;
    let cnt;
    if(Number(kelp_pool<0)) (kelp_pool=10);
    if(Number(kelp_moat<0)) (kelp_moat=30);
    /* Place kelp, except on the plane of water */
    if(Number(!!(Number(!(skip_lvl_checks))&&(Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_astral_level").address,"d_level","dnum").value)))))) return;
    for((x=C.i16(2));Number(C.i32(x)<(C.i32((80-2))));((x=C.i16((x+1)))-1)) for((y=C.i16(1));Number(C.i32(y)<(C.i32((21-1))));((y=C.i16((y+1)))-1)) if(water_has_kelp(x,y,kelp_pool,kelp_moat)) C.mksobj_at(C.KELP_FROND,x,y,(C.i8(1)),(C.i8(0)));


    /* determine if it is even allowed;
       almost all special levels are excluded */
    if(Number(!!(Number(!(skip_lvl_checks))&&(Number(!!(Number(!!(Number(!!(Number(!!(C.i32(C.In_hell(C.field(C.u,"you","uz").address))||C.i32(C.In_V_tower(C.field(C.u,"you","uz").address))))||((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address))))))))||C.i32(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","arboreal").value)))||(Number(!!(Number(!!(Number(((sp=C.Is_special(C.field(C.u,"you","uz").address)))!=0)&&Number(!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_oracle_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_oracle_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_oracle_level").address))))))))))&&(Number(!!(Number(!(C.In_mines(C.field(C.u,"you","uz").address)))||C.i32(C.field(C.field(sp,"s_level","flags").address,"d_flags","town").value))))))))))))) return;
    /* basic level-related probabilities */
    if(Number(goldprob<0)) (goldprob=C.i32((20+C.i32(Math.trunc((C.i32(C.depth(C.field(C.u,"you","uz").address))/3))))));
    if(Number(gemprob<0)) (gemprob=C.i32(Math.trunc((goldprob/4))));
    /* mines have ***MORE*** goodies - otherwise why mine? */
    if(Number(!(skip_lvl_checks))) {
        if(C.In_mines(C.field(C.u,"you","uz").address)) {
            (goldprob=C.i32(goldprob*2));
            (gemprob=C.i32(gemprob*3));
        } else if(C.In_quest(C.field(C.u,"you","uz").address)) {
            (goldprob=C.i32(Math.trunc(goldprob/4)));
            (gemprob=C.i32(Math.trunc(gemprob/6)));
        }
    }
    /*
     * Seed rock areas with gold and/or gems.
     * We use fairly low level object handling to avoid unnecessary
     * overhead from placing things in the floor chain prior to burial.
     */
    for((x=C.i16(2));Number(C.i32(x)<(C.i32((80-2))));((x=C.i16((x+1)))-1)) for((y=C.i16(1));Number(C.i32(y)<(C.i32((21-1))));((y=C.i16((y+1)))-1)) if(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(y)+1)))*C.sizes["struct rm"]),"rm","typ").value)!=C.STONE)) {
        /* <x,y> spot not eligible */
        (y=C.i16(y+2));
        /* next two spots aren't eligible either */
    } else if(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)!=C.STONE)) {
        /* this spot not eligible */
        (y=C.i16(y+1));
        /* next spot isn't eligible either */
    } else if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!((C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value)&8)))))&&Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(y)-1)))*C.sizes["struct rm"]),"rm","typ").value)==C.STONE)))&&Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(x)+1)))*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(y)-1)))*C.sizes["struct rm"]),"rm","typ").value)==C.STONE)))&&Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(x)-1)))*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(y)-1)))*C.sizes["struct rm"]),"rm","typ").value)==C.STONE)))&&Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(x)+1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.STONE)))&&Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(x)-1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.STONE)))&&Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(x)+1)))*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(y)+1)))*C.sizes["struct rm"]),"rm","typ").value)==C.STONE)))&&Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(x)-1)))*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(y)+1)))*C.sizes["struct rm"]),"rm","typ").value)==C.STONE)))) {
        if(Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1515,(C.literal("mineralize"))),C.rn2(1000))):C.rn2(1000)))<goldprob)) {
            if(Number(((otmp=C.mksobj(C.GOLD_PIECE,(C.i8(0)),(C.i8(0)))))!=0)) {
                ((C.field(otmp,"obj","ox").value=x),(C.field(otmp,"obj","oy").value=y));
                (C.field(otmp,"obj","quan").value=C.i64((1n+C.i64(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1518,(C.literal("mineralize"))),C.rnd(C.i32((goldprob*3))))):C.rnd(C.i32((goldprob*3)))))))));
                (C.field(otmp,"obj","owt").value=C.u32(C.weight(otmp)));
                if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1520,(C.literal("mineralize"))),C.rn2(3))):C.rn2(3)))))) C.add_to_buried(otmp);
 else C.place_object(otmp,x,y);
            }
        }
        if(Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1526,(C.literal("mineralize"))),C.rn2(1000))):C.rn2(1000)))<gemprob)) {
            for((cnt=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1527,(C.literal("mineralize"))),C.rnd(C.i32((2+C.i32(Math.trunc((C.i32(C.dunlev(C.field(C.u,"you","uz").address))/3)))))))):C.rnd(C.i32((2+C.i32(Math.trunc((C.i32(C.dunlev(C.field(C.u,"you","uz").address))/3)))))))));Number(cnt>0);((cnt=C.i32((cnt-1)))+1)) if(Number(((otmp=C.mkobj(C.GEM_CLASS,(C.i8(0)))))!=0)) {
                if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.ROCK)) {
                    C.dealloc_obj(otmp);
                    /* discard it */
                } else {
                    ((C.field(otmp,"obj","ox").value=x),(C.field(otmp,"obj","oy").value=y));
                    if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1533,(C.literal("mineralize"))),C.rn2(3))):C.rn2(3)))))) C.add_to_buried(otmp);
 else C.place_object(otmp,x,y);
                }
            }

        }
    }


}

export function level_finalize_topology()
{
    let croom;
    let ridx;
    C.bound_digging();
    mineralize(C.i32((-1)),C.i32((-1)),C.i32((-1)),C.i32((-1)),(C.i8(0)));
    (C.field(C.gi,"instance_globals_i","in_mklev").value=(C.i8(0)));
    /* avoid coordinates in future lua-loads for this level being thrown off
     * because xstart and ystart aren't saved with the level and will be 0
     * after leaving and returning */
    (C.field(C.gx,"instance_globals_x","xstart").value=(C.field(C.gy,"instance_globals_y","ystart").value=C.i16(0)));
    /* has_morgue gets cleared once morgue is entered; graveyard stays
       set (graveyard might already be set even when has_morgue is clear
       [see fixup_special()], so don't update it unconditionally) */
    if(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","has_morgue").value) (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","graveyard").value=C.u32(1));
    if(Number(!(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","is_maze_lev").value))) {
        for((croom=(C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(0)*C.sizes["struct mkroom"]));Number(croom!=(C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(C.field(C.svn,"instance_globals_saved_n","nroom").value)*C.sizes["struct mkroom"]));((croom=C.ptr((croom+Number(C.sizes["struct mkroom"]))))-Number(C.sizes["struct mkroom"]))) topologize(croom);

    }
    C.set_wall_state();
    /* for many room types, svr.rooms[].rtype is zeroed once the room has been
       entered; svr.rooms[].orig_rtype always retains original rtype value */
    for((ridx=0);Number(ridx<C.i32((C.u64((BigInt((C.sizes["struct mkroom"]*82))/BigInt(C.sizes["struct mkroom"]))))));((ridx=C.i32((ridx+1)))-1)) (C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(ridx)*C.sizes["struct mkroom"]),"mkroom","orig_rtype").value=C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(ridx)*C.sizes["struct mkroom"]),"mkroom","rtype").value);

}

export function mklev()
{
    C.reseed_random(C.nativeFunctionPointer("rn2"));
    C.reseed_random(C.nativeFunctionPointer("rn2_on_display_rng"));
    C.init_mapseen(C.field(C.u,"you","uz").address);
    if(C.getbones()) return;
    (C.field(C.gi,"instance_globals_i","in_mklev").value=(C.i8(1)));
    makelevel();
    level_finalize_topology();
    C.reseed_random(C.nativeFunctionPointer("rn2"));
    C.reseed_random(C.nativeFunctionPointer("rn2_on_display_rng"));
}

export function topologize(croom)
{
    croom=C.ptr(croom);
    let x; let y;
    let roomno=C.i32((C.i64(((C.i64(((croom-C.field(C.svr,"instance_globals_saved_r","rooms").address)/C.sizes["struct mkroom"])))+C.i64(3)))));
    let lowx=C.field(croom,"mkroom","lx").value; let lowy=C.field(croom,"mkroom","ly").value;
    let hix=C.field(croom,"mkroom","hx").value; let hiy=C.field(croom,"mkroom","hy").value;
    let subindex; let nsubrooms=C.i32(C.field(croom,"mkroom","nsubrooms").value);
    /* skip the room if already done; i.e. a shop handled out of order */
    /* also skip if this is non-rectangular (it _must_ be done already) */
    if(Number(!!(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(lowx)*(C.sizes["struct rm"]*21))+Number(lowy)*C.sizes["struct rm"]),"rm","roomno").value)==roomno)||C.i32(C.field(croom,"mkroom","irregular").value)))) return;
    /* vision routine helper */
{
        /* do innards first */
        for((x=lowx);Number(C.i32(x)<=C.i32(hix));((x=C.i16((x+1)))-1)) for((y=lowy);Number(C.i32(y)<=C.i32(hiy));((y=C.i16((y+1)))-1)) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","roomno").value=C.u32(roomno));


        /* top and bottom edges */
        for((x=C.i16(C.i32((C.i32(lowx)-1))));Number(C.i32(x)<=C.i32((C.i32(hix)+1)));((x=C.i16((x+1)))-1)) for((y=C.i16(C.i32((C.i32(lowy)-1))));Number(C.i32(y)<=C.i32((C.i32(hiy)+1)));(y=C.i16(y+(C.i32((C.i32((C.i32(hiy)-C.i32(lowy)))+2)))))) {
            (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","edge").value=C.u32(1));
            if(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","roomno").value) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","roomno").value=C.u32(1));
 else (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","roomno").value=C.u32(roomno));
        }

        /* sides */
        for((x=C.i16(C.i32((C.i32(lowx)-1))));Number(C.i32(x)<=C.i32((C.i32(hix)+1)));(x=C.i16(x+(C.i32((C.i32((C.i32(hix)-C.i32(lowx)))+2)))))) for((y=lowy);Number(C.i32(y)<=C.i32(hiy));((y=C.i16((y+1)))-1)) {
            (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","edge").value=C.u32(1));
            if(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","roomno").value) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","roomno").value=C.u32(1));
 else (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","roomno").value=C.u32(roomno));
        }

    }    /* gs.subrooms */
    for((subindex=0);Number(subindex<nsubrooms);((subindex=C.i32((subindex+1)))-1)) topologize(C.cell((C.field(croom,"mkroom","sbrooms").address+Number(subindex)*8),"struct mkroom *").value);

}

/* Find an unused room for a branch location. */
export function find_branch_room(mp)
{
    mp=C.ptr(mp);
    let croom=0;
    if(Number(C.field(C.svn,"instance_globals_saved_n","nroom").value==0)) {
        C.mazexy(mp);
        /* already verifies location */
    } else {
        (croom=generate_stairs_find_room());
        ((Number(!!((Number(croom!=(0)))||((C.__assert_fail(C.literal("croom != NULL"),C.literal("mklev.c"),1668,(C.literal("find_branch_room"))),0))))));
        /* Null iff nroom==0 which won't get here */
        if(Number(!(C.somexyspace(croom,mp)))) C.variadic(14,C.literal("Can't place branch!"));
    }
    return croom;
}

/* Find the room for (x,y).  Return null if not in a room. */
export function pos_to_room(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let i;
    let curr;
    for(((curr=C.field(C.svr,"instance_globals_saved_r","rooms").address),(i=0));Number(i<C.field(C.svn,"instance_globals_saved_n","nroom").value);(((curr=C.ptr((curr+Number(C.sizes["struct mkroom"]))))-Number(C.sizes["struct mkroom"])),((i=C.i32((i+1)))-1))) if(C.inside_room(curr,x,y)) return curr;

    ;
    return 0;
}

/* If given a branch, randomly place a special stair or portal. */
export function place_branch(br,x,y)
{
    br=C.ptr(br);
    x=C.i16(x);
    y=C.i16(y);
    const stackFrame=C.stackSave();
    try {
    /* branch to place */
    /* location */
    let m=C.stackAlloc(C.sizes["struct nhcoord"]); C.initialize(m,"struct nhcoord",[C.i16(0),0]);
    let dest;
    let make_stairs;
    /*
     * Return immediately if there is no branch to make or we have
     * already made one.  This routine can be called twice when
     * a special level is loaded that specifies an SSTAIR location
     * as a favored spot for a branch.
     */
    if(Number(!!(Number(!(br))||C.i32(C.field(C.gm,"instance_globals_m","made_branch").value)))) return;
    if(Number(!(x))) {
        /* find random coordinates for branch */
        /* br_room = find_branch_room(&m); */
        find_branch_room(m);
        /* sets m via mazexy() or somexy() */
        (x=C.field(m,"nhcoord","x").value);
        (y=C.field(m,"nhcoord","y").value);
    } else {
        pos_to_room(x,y);
    }
    if(C.on_level(C.field(br,"branch","end1").address,C.field(C.u,"you","uz").address)) {
        /* we're on end1 */
        (make_stairs=C.i8(Number(C.field(br,"branch","type").value!=1)));
        (dest=C.field(br,"branch","end2").address);
    } else {
        /* we're on end2 */
        (make_stairs=C.i8(Number(C.field(br,"branch","type").value!=2)));
        (dest=C.field(br,"branch","end1").address);
    }
    if(Number(C.field(br,"branch","type").value==3)) {
        if(Number(!!(C.i32(C.field(C.iflags,"instance_flags","debug_fuzzer").value)&&(Number(!!(C.i32(C.field(C.field(C.u,"you","ucamefrom").address,"d_level","dnum").value)||C.i32(C.field(C.field(C.u,"you","ucamefrom").address,"d_level","dlevel").value))))))) C.mkportal(x,y,C.field(C.field(C.u,"you","ucamefrom").address,"d_level","dnum").value,C.field(C.field(C.u,"you","ucamefrom").address,"d_level","dlevel").value);
 else C.mkportal(x,y,C.field(dest,"d_level","dnum").value,C.field(dest,"d_level","dlevel").value);
    } else if(make_stairs) {
        let goes_up=C.i8((C.i32(C.on_level(C.field(br,"branch","end1").address,C.field(C.u,"you","uz").address))?C.i32(C.field(br,"branch","end1_up").value):Number(!(C.field(br,"branch","end1_up").value))));
        C.stairway_add(x,y,goes_up,(C.i8(0)),dest);
        C.set_levltyp(x,y,C.i8(C.STAIRS));
        (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value=C.u32((C.i32(goes_up)?1:2)));
    }
    /*
     * Set made_branch to TRUE even if we didn't make a stairwell (i.e.
     * make_stairs is false) since there is currently only one branch
     * per level, if we failed once, we're going to fail again on the
     * next call.
     */
    (C.field(C.gm,"instance_globals_m","made_branch").value=(C.i8(1)));
    } finally {C.stackRestore(stackFrame); }
}

export function bydoor(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let typ;
    if(C.isok(C.i16(C.i32((C.i32(x)+1))),y)) {
        (typ=C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(x)+1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value));
        if(Number(!!((Number((typ)==C.DOOR))||Number(typ==C.SDOOR)))) return (C.i8(1));
    }
    if(C.isok(C.i16(C.i32((C.i32(x)-1))),y)) {
        (typ=C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(x)-1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value));
        if(Number(!!((Number((typ)==C.DOOR))||Number(typ==C.SDOOR)))) return (C.i8(1));
    }
    if(C.isok(x,C.i16(C.i32((C.i32(y)+1))))) {
        (typ=C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(y)+1)))*C.sizes["struct rm"]),"rm","typ").value));
        if(Number(!!((Number((typ)==C.DOOR))||Number(typ==C.SDOOR)))) return (C.i8(1));
    }
    if(C.isok(x,C.i16(C.i32((C.i32(y)-1))))) {
        (typ=C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(y)-1)))*C.sizes["struct rm"]),"rm","typ").value));
        if(Number(!!((Number((typ)==C.DOOR))||Number(typ==C.SDOOR)))) return (C.i8(1));
    }
    return (C.i8(0));
}

/* see whether it is allowable to create a door at [x,y] */
export function okdoor(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let near_door=bydoor(x,y);
    return (Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.HWALL)||Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.VWALL))))&&(Number(!!(Number(!!(Number(!!((Number(!!(C.isok(C.i16(C.i32((C.i32(x)-1))),y)&&Number(!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(x)-1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))<C.POOL)))))))||(Number(!!(C.isok(C.i16(C.i32((C.i32(x)+1))),y)&&Number(!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(x)+1)))*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))<C.POOL)))))))))||(Number(!!(C.isok(x,C.i16(C.i32((C.i32(y)-1))))&&Number(!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(y)-1)))*C.sizes["struct rm"]),"rm","typ").value))<C.POOL)))))))))||(Number(!!(C.isok(x,C.i16(C.i32((C.i32(y)+1))))&&Number(!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(y)+1)))*C.sizes["struct rm"]),"rm","typ").value))<C.POOL))))))))))))&&Number(!(near_door)))));
}

/* do we want a secret door/corridor? */
export function maybe_sdoor(chance)
{
    chance=C.i32(chance);
    return C.i8(Number(!!((Number(C.i32(C.depth(C.field(C.u,"you","uz").address))>2))&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1795,(C.literal("maybe_sdoor"))),C.rn2(((Number((2)>(chance))?(2):(chance)))))):C.rn2(((Number((2)>(chance))?(2):(chance)))))))))));
}

/* create a door at x,y in room aroom */
export function dodoor(x,y,aroom)
{
    x=C.i16(x);
    y=C.i16(y);
    aroom=C.ptr(aroom);
    dosdoor(x,y,aroom,(C.i32(maybe_sdoor(8))?C.SDOOR:C.DOOR));
}

export function occupied(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    return C.i8((Number(!!(Number(!!(Number(!!(Number(!!(C.t_at(x,y)||(Number(!!(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))>=C.STAIRS)&&Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))<=C.ALTAR))))))||C.i32(C.is_lava(x,y))))||C.i32(C.is_pool(x,y))))||C.i32(C.invocation_pos(x,y))))));
}

/* generate a corpse and some items on top of a trap */
export function mktrap_victim(ttmp)
{
    ttmp=C.ptr(ttmp);
    /* Object generated by the trap; initially NULL, stays NULL if
       the trap doesn't generate objects. */
    let otmp=0;
    let victim_mnum;
    /* race of the victim */
    let lvl=C.u32(C.level_difficulty());
    let kind=C.i32(C.field(ttmp,"trap","ttyp").value);
    let x=C.field(ttmp,"trap","tx").value; let y=C.field(ttmp,"trap","ty").value;
    ((Number(!!((Number(!!(Number(!!(Number(!!(Number(C.i32(x)>0)&&Number(C.i32(x)<80)))&&Number(C.i32(y)>=0)))&&Number(C.i32(y)<21))))||((C.__assert_fail(C.literal("x > 0 && x < COLNO && y >= 0 && y < ROWNO"),C.literal("mklev.c"),1825,(C.literal("mktrap_victim"))),0))))));
    /* Not all trap types have special handling here; only the ones
       that kill in a specific way that's obvious after the fact. */
    switch(kind) {
        case (C.ARROW_TRAP):
            (otmp=C.mksobj(C.ARROW,(C.i8(1)),(C.i8(0))));
        (C.field(otmp,"obj","otrapped").value=C.u32(0));
        /* don't adjust the quantity; maybe the trap shot multiple
           times, there was an untrapping attempt, etc... */
        break;
        case (C.DART_TRAP):
            (otmp=C.mksobj(C.DART,(C.i8(1)),(C.i8(0))));
        break;
        case (C.ROCKTRAP):
            (otmp=C.mksobj(C.ROCK,(C.i8(1)),(C.i8(0))));
        break;
        default:
            /* no item dropped by the trap */
            break;
    }
    if(otmp) {
        C.place_object(otmp,x,y);
    }
    /* now otmp is reused for other items we're placing */
    /* Place a random possession. This could be a weapon, tool,
       food, or gem, i.e. the item classes that are typically
       nonmagical and not worthless. */
    do {
        let poss_class=C.RANDOM_CLASS;
        /* init => lint suppression */
        switch(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1857,(C.literal("mktrap_victim"))),C.rn2(4))):C.rn2(4)))) {
            case (0):
                (poss_class=C.WEAPON_CLASS);
            break;
            case (1):
                (poss_class=C.TOOL_CLASS);
            break;
            case (2):
                (poss_class=C.FOOD_CLASS);
            break;
            case (3):
                (poss_class=C.GEM_CLASS);
            break;
        }
        /* these items are always cursed, both for flavour (owned
           by a dead adventurer, bones-pile-style) and for balance
           (less useful to use, and encourage pets to avoid the trap) */
        (otmp=C.mkobj(poss_class,(C.i8(0))));
        C.curse(otmp);
        /* for mktrap_victim(), PIT is actually an exploded LANDMINE */
        if(Number(!!(Number(C.i32(C.field(ttmp,"trap","ttyp").value)==C.PIT)&&C.i32(C.breaktest(otmp))))) {
            /* landmine: if fragile object has been created, destroy it;
               don't worry about non-empty containers--they aren't
               breakable--nor about breakable contents of such */
            C.dealloc_obj(otmp);
        } else {
            C.place_object(otmp,x,y);
        }
        /* 20% chance of placing an additional item, recursively */
    } while(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1888,(C.literal("mktrap_victim"))),C.rn2(5))):C.rn2(5))))));
    /* Place a corpse. */
    switch(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1891,(C.literal("mktrap_victim"))),C.rn2(15))):C.rn2(15)))) {
        case (0):
            /* elf corpses are the rarest as they're the most useful */
            (victim_mnum=C.PM_ELF);
        /* elven adventurers get sleep resistance early; so don't
           generate elf corpses on sleeping gas traps unless a)
           we're on dlvl 2 (1 is impossible) and b) we pass a coin
           flip */
        if(Number(!!(Number(kind==C.SLP_GAS_TRAP)&&Number(!((Number(!!(Number(lvl<=C.u32(2))&&((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1899,(C.literal("mktrap_victim"))),C.rn2(2))):C.rn2(2))))))))))) (victim_mnum=C.PM_HUMAN);
        break;
        case (1):
            case (2):
                (victim_mnum=C.PM_DWARF);
        break;
        case (3):
            case (4):
                case (5):
                    (victim_mnum=C.PM_ORC);
        break;
        case (6):
            case (7):
                case (8):
                    case (9):
                        /* more common as they could have come from the Mines */
                        (victim_mnum=C.PM_GNOME);
        /* 10% chance of a candle too */
        if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1912,(C.literal("mktrap_victim"))),C.rn2(10))):C.rn2(10)))))) {
            (otmp=C.mksobj((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1913,(C.literal("mktrap_victim"))),C.rn2(4))):C.rn2(4)))?C.TALLOW_CANDLE:C.WAX_CANDLE),(C.i8(1)),(C.i8(0))));
            (C.field(otmp,"obj","quan").value=C.i64(1));
            (C.field(otmp,"obj","owt").value=C.u32(C.weight(otmp)));
            C.curse(otmp);
            C.place_object(otmp,x,y);
            if(Number(!(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","lit").value))) C.begin_burn(otmp,(C.i8(0)));
        }
        break;
        default:
            /* human is the most common result */
            (victim_mnum=C.PM_HUMAN);
        break;
    }
    /* PM_HUMAN is a placeholder monster primarily used for zombie, mummy,
       and vampire corpses; usually change it into a fake player monster
       instead (always human); no role-specific equipment is provided */
    if(Number(!!(Number(victim_mnum==C.PM_HUMAN)&&((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1930,(C.literal("mktrap_victim"))),C.rn2(25))):C.rn2(25)))))) (victim_mnum=(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1931,(C.literal("mktrap_victim"))),C.rn2(C.i32((C.PM_WIZARD-C.PM_ARCHEOLOGIST))))):C.rn2(C.i32((C.PM_WIZARD-C.PM_ARCHEOLOGIST)))))+(C.PM_ARCHEOLOGIST)))));
    (otmp=C.mkcorpstat(C.CORPSE,0,(C.mons+Number(victim_mnum)*C.sizes["struct permonst"]),x,y,C.u32(8)));
    (C.field(otmp,"obj","age").value=C.i64(C.field(otmp,"obj","age").value-(C.i64(((50n)+C.i64(1))))));
    /* died too long ago to safely eat */
}

/* pick a random trap type, return NO_TRAP if "too hard" */
export function traptype_rnd(mktrapflags)
{
    mktrapflags=C.u32(mktrapflags);
    let lvl=C.u32(C.level_difficulty());
    let kind=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1941,(C.literal("traptype_rnd"))),C.rnd(C.i32((C.TRAPNUM-1))))):C.rnd(C.i32((C.TRAPNUM-1)))));
    switch(kind) {
        /* these are controlled by the feature or object they guard,
           not by the map so mustn't be created on it */
        case (C.TRAPPED_DOOR):
            case (C.TRAPPED_CHEST):
                (kind=C.NO_TRAP);
        break;
        /* these can have a random location but can't be generated
           randomly */
        case (C.MAGIC_PORTAL):
            case (C.VIBRATING_SQUARE):
                (kind=C.NO_TRAP);
        break;
        case (C.ROLLING_BOULDER_TRAP):
            case (C.SLP_GAS_TRAP):
                if(Number(lvl<C.u32(2))) (kind=C.NO_TRAP);
        break;
        case (C.LEVEL_TELEP):
            if(Number(!!(Number(!!(Number(lvl<C.u32(5))||C.i32(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","noteleport").value)))||C.i32(C.single_level_branch(C.field(C.u,"you","uz").address))))) (kind=C.NO_TRAP);
        break;
        case (C.SPIKED_PIT):
            if(Number(lvl<C.u32(5))) (kind=C.NO_TRAP);
        break;
        case (C.LANDMINE):
            if(Number(lvl<C.u32(6))) (kind=C.NO_TRAP);
        break;
        case (C.WEB):
            if(Number(!!(Number(lvl<C.u32(7))&&Number(!((C.u32((mktrapflags&4)))))))) (kind=C.NO_TRAP);
        break;
        case (C.STATUE_TRAP):
            case (C.POLY_TRAP):
                if(Number(lvl<C.u32(8))) (kind=C.NO_TRAP);
        break;
        case (C.FIRE_TRAP):
            if(Number(!(C.In_hell(C.field(C.u,"you","uz").address)))) (kind=C.NO_TRAP);
        break;
        case (C.TELEP_TRAP):
            if(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","noteleport").value) (kind=C.NO_TRAP);
        break;
        case (C.HOLE):
            /* make these much less often than other traps */
            if(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),1993,(C.literal("traptype_rnd"))),C.rn2(7))):C.rn2(7)))) (kind=C.NO_TRAP);
        break;
    }
    return kind;
}

/* random trap type for the Rogue level */
export function traptype_roguelvl()
{
    let kind;
    switch(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),2006,(C.literal("traptype_roguelvl"))),C.rn2(7))):C.rn2(7)))) {
        default:
            (kind=C.BEAR_TRAP);
        break;
        /* 0 */
        case (1):
            (kind=C.ARROW_TRAP);
        break;
        case (2):
            (kind=C.DART_TRAP);
        break;
        case (3):
            (kind=C.TRAPDOOR);
        break;
        case (4):
            (kind=C.PIT);
        break;
        case (5):
            (kind=C.SLP_GAS_TRAP);
        break;
        case (6):
            (kind=C.RUST_TRAP);
        break;
    }
    return kind;
}

/* mktrap(): select trap type and location, then use maketrap() to create it;
   make it at location 'tm' when that isn't Null, otherwise in 'croom'
   if mktrapflags doesn't have MKTRAP_MAZEFLAG set, else in maze corridor */
export function mktrap(num,mktrapflags,croom,tm)
{
    num=C.i32(num);
    mktrapflags=C.u32(mktrapflags);
    croom=C.ptr(croom);
    tm=C.ptr(tm);
    const stackFrame=C.stackSave();
    try {
    /* if non-zero, specific type of trap to make */
    /* MKTRAP_{SEEN,MAZEFLAG,NOSPIDERONWEB,NOVICTIM} */
    /* room to hold trap */
    /* specific location for trap */
    
    /* move to struct g? */
    let t;
    let m=C.stackAlloc(C.sizes["struct nhcoord"]);
    let kind;
    let lvl=C.u32(C.level_difficulty());
    if(Number(!!(Number(!!(Number(!(tm))&&Number(!(croom))))&&Number(!((C.u32((mktrapflags&2)))))))) {
        /* complain when the combination of arguments will never set 'm' */
        if(Number(!(((C.cell(C.staticAddress("mktrap_err"),"int").value=C.i32((C.cell(C.staticAddress("mktrap_err"),"int").value+1)))-1)))) {
            let errbuf=C.stackAlloc((1*256));
            C.variadic(15,(C.literal("mktrap")),2055,errbuf,BigInt((1*256)),C.literal("args (%d,%d,%s,%s) are invalid"),num,mktrapflags,C.literal("null room"),C.literal("null location"));
            C.paniclog(C.literal("mktrap"),errbuf);
        }
        return;
    }
    (C.field(m,"nhcoord","x").value=(C.field(m,"nhcoord","y").value=C.i16(0)));
    /* no traps in pools */
    if(Number(!!(tm&&C.i32(C.is_pool_or_lava(C.field(tm,"nhcoord","x").value,C.field(tm,"nhcoord","y").value))))) return;
    if(Number(!!(Number(num>C.NO_TRAP)&&Number(num<C.TRAPNUM)))) {
        (kind=num);
    } else if(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address))))))) {
        (kind=traptype_roguelvl());
    } else if(Number(!!(C.i32(C.In_hell(C.field(C.u,"you","uz").address))&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),2070,(C.literal("mktrap"))),C.rn2(5))):C.rn2(5)))))))) {
        /* bias the frequency of fire traps in Gehennom */
        (kind=C.FIRE_TRAP);
    } else {
        do {
            (kind=traptype_rnd(mktrapflags));
        } while(Number(kind==C.NO_TRAP));
    }
    if(Number(!!((Number(!!(Number((kind)==C.HOLE)||Number((kind)==C.TRAPDOOR))))&&Number(!(C.Can_fall_thru(C.field(C.u,"you","uz").address)))))) (kind=C.ROCKTRAP);
    if(tm) {
        C.copy(m,tm,C.sizes["struct nhcoord"]);
    } else {
        let tryct=0;
        let avoid_boulder=C.i8((Number(!!((Number(!!(Number((kind)==C.PIT)||Number((kind)==C.SPIKED_PIT))))||(Number(!!(Number((kind)==C.HOLE)||Number((kind)==C.TRAPDOOR))))))));
        do {
            if(Number((tryct=C.i32((tryct+1)))>200)) return;
            if(Number((C.u32((mktrapflags&2)))!=C.u32(0))) C.mazexy(m);
 else if(Number(!!(croom&&Number(!(C.somexyspace(croom,m)))))) return;
        } while(Number(!!(C.i32(occupied(C.field(m,"nhcoord","x").value,C.field(m,"nhcoord","y").value))||(Number(!!(C.i32(avoid_boulder)&&C.sobj_at(C.BOULDER,C.field(m,"nhcoord","x").value,C.field(m,"nhcoord","y").value)))))));
    }
    (t=C.maketrap(C.field(m,"nhcoord","x").value,C.field(m,"nhcoord","y").value,kind));
    /* we should always get type of trap we're asking for (occupied() test
       should prevent cases where that might not happen) but be paranoid */
    (kind=(t?C.i32(C.field(t,"trap","ttyp").value):C.NO_TRAP));
    if(Number(!!(Number(kind==C.WEB)&&Number(!((C.u32((mktrapflags&4)))))))) C.makemon((C.mons+Number(C.PM_GIANT_SPIDER)*C.sizes["struct permonst"]),C.field(m,"nhcoord","x").value,C.field(m,"nhcoord","y").value,C.u32(0n));
    if(Number(!!(t&&(C.u32((mktrapflags&1)))))) (C.field(t,"trap","tseen").value=C.u32((C.i8(1))));
    if(Number(!!(Number(kind==C.MAGIC_PORTAL)&&(Number(!!(C.i32(C.field(C.field(C.u,"you","ucamefrom").address,"d_level","dnum").value)||C.i32(C.field(C.field(C.u,"you","ucamefrom").address,"d_level","dlevel").value))))))) {
        C.assign_level(C.field(t,"trap","dst").address,C.field(C.u,"you","ucamefrom").address);
    }
    /* The hero isn't the only person who's entered the dungeon in
       search of treasure. On the very shallowest levels, there's a
       chance that a created trap will have killed something already
       (and this is guaranteed on the first level).

       This isn't meant to give any meaningful treasure (in fact, any
       items we drop here are typically cursed, other than ammo fired
       by the trap). Rather, it's mostly just for flavour and to give
       players on very early levels a sufficient chance to avoid traps
       that may end up killing them before they have a fair chance to
       build max HP. Including cursed items gives the same fair chance
       to the starting pet, and fits the rule that possessions of the
       dead are normally cursed.

       Some types of traps are excluded because they're entirely
       nonlethal, even indirectly. We also exclude all of the
       later/fancier traps because they tend to have special
       considerations (e.g. webs, portals), often are indirectly
       lethal, and tend not to generate on shallower levels anyway
       (exception: magic traps can generate on dlvl 1 and be
       immediately lethal). Finally, pits are excluded because it's
       weird to see an item in a pit and yet not be able to identify
       that the pit is there. */
    if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(C.i32(C.field(C.gi,"instance_globals_i","in_mklev").value)&&Number(kind!=C.NO_TRAP)))&&Number(!((C.u32((mktrapflags&8)))))))&&Number(lvl<=C.u32(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),2137,(C.literal("mktrap"))),C.rnd(4))):C.rnd(4)))))))&&Number(kind!=C.SQKY_BOARD)))&&Number(kind!=C.RUST_TRAP)))&&Number(!((Number(!!(Number(!!(Number(kind==C.ROLLING_BOULDER_TRAP)&&Number(C.i32(C.field(C.field(t,"trap","launch").address,"nhcoord","x").value)==C.i32(C.field(t,"trap","tx").value))))&&Number(C.i32(C.field(C.field(t,"trap","launch").address,"nhcoord","y").value)==C.i32(C.field(t,"trap","ty").value)))))))))&&Number(!((Number(!!(Number((kind)==C.PIT)||Number((kind)==C.SPIKED_PIT))))))))&&(Number(!!(Number(kind<C.HOLE)||Number(kind==C.MAGIC_TRAP))))))) {
        /* rolling boulder trap might not have a boulder if there was no
           viable path (such as when placed in the corner of a room), in
           which case tx,ty==launch.x,y; no boulder => no dead predecessor */
        if(Number(kind==C.LANDMINE)) {
            /* if victim was killed by a land mine, we won't scatter objects;
               treat it as exploded, converting it into an unconcealed pit */
            (C.field(t,"trap","ttyp").value=C.u32(C.PIT));
            (C.field(t,"trap","tseen").value=C.u32(1));
        }
        mktrap_victim(t);
    }
    return;
    } finally {C.stackRestore(stackFrame); }
}

/* Create stairs up or down at x,y.
   If force is TRUE, change the terrain to ROOM first */
export function mkstairs(x,y,up,croom,force)
{
    x=C.i16(x);
    y=C.i16(y);
    up=C.i8(up);
    croom=C.ptr(croom);
    force=C.i8(force);
    const stackFrame=C.stackSave();
    try {
    /* [why 'char' when usage is boolean?] */
    let ltyp;
    let dest=C.stackAlloc(C.sizes["struct d_level"]);
    if(Number(!!(Number(!(x))||Number(!(C.isok(x,y)))))) {
        C.variadic(16,C.literal("mkstairs:  bogus stair attempt at <%d,%d>"),C.i32(x),C.i32(y));
        return;
    }
    if(force) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value=C.i8(C.ROOM));
    (ltyp=C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value));
    /* somexyspace() allows ice */
    if(Number(!!(Number(!!(Number(ltyp!=C.ROOM)&&Number(ltyp!=C.CORR)))&&Number(ltyp!=C.ICE)))) {
        let glyph=C.back_to_glyph(x,y); let sidx=C.glyph_to_cmap(glyph);
        C.variadic(17,C.literal("mkstairs:  placing stairs %s on %s at <%d,%d>"),(C.i32(up)?C.literal("up"):C.literal("down")),C.field((C.defsyms+Number(sidx)*C.sizes["struct symdef"]),"symdef","explanation").value,C.i32(x),C.i32(y));
    }
    /*
     * We can't make a regular stair off an end of the dungeon.  This
     * attempt can happen when a special level is placed at an end and
     * has an up or down stair specified in its description file.
     */
    if(Number(C.i32(C.dunlev(C.field(C.u,"you","uz").address))==((C.i32(up)?1:C.i32(C.dunlevs_in_dungeon(C.field(C.u,"you","uz").address)))))) return;
    (C.field(dest,"d_level","dnum").value=C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value);
    (C.field(dest,"d_level","dlevel").value=C.i16(C.i32((C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dlevel").value)+((C.i32(up)?C.i32((-1)):1))))));
    C.stairway_add(x,y,C.i8((C.i32(up)?C.i32((C.i8(1))):C.i32((C.i8(0))))),(C.i8(0)),dest);
    C.set_levltyp(x,y,C.i8(C.STAIRS));
    (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value=C.u32((C.i32(up)?1:2)));
    } finally {C.stackRestore(stackFrame); }
}

/* is room a good one to generate up or down stairs in? */
export function generate_stairs_room_good(croom,phase)
{
    croom=C.ptr(croom);
    phase=C.i32(phase);
    /*
     * phase values, smaller allows for more relaxed criteria:
     *  2 == no relaxed criteria;
     *  1 == allow a themed room;
     *  0 == allow same room as existing up/downstairs;
     * -1 == allow an unjoined room.
     */
    return C.i8((Number(!!(Number(!!(Number(!!(croom&&(Number(!!(C.i32(C.field(croom,"mkroom","needjoining").value)||(Number(phase<0)))))))&&(Number(!!((Number(!!(Number(!(C.has_dnstairs(croom)))&&Number(!(C.has_upstairs(croom))))))||Number(phase<1))))))&&(Number(!!(Number(C.i32(C.field(croom,"mkroom","rtype").value)==C.OROOM)||(Number(!!((Number(phase<2))&&Number(C.i32(C.field(croom,"mkroom","rtype").value)==C.THEMEROOM)))))))))));
}

/* find a good room to generate an up or down stairs in */
export function generate_stairs_find_room()
{
    let croom;
    let i; let phase; let ai;
    let rmarr;
    if(Number(!(C.field(C.svn,"instance_globals_saved_n","nroom").value))) return 0;
    (rmarr=C.alloc(C.u32(C.u64((BigInt(4)*C.u64(C.field(C.svn,"instance_globals_saved_n","nroom").value))))));
    for((phase=2);Number(phase>C.i32((-1)));((phase=C.i32((phase-1)))+1)) {
        (ai=0);
        for((i=0);Number(i<C.field(C.svn,"instance_globals_saved_n","nroom").value);((i=C.i32((i+1)))-1)) if(generate_stairs_room_good((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(i)*C.sizes["struct mkroom"]),phase)) (C.cell((rmarr+Number(((ai=C.i32((ai+1)))-1))*4),"int").value=i);

        if(Number(ai>0)) {
            (i=C.cell((rmarr+Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),2236,(C.literal("generate_stairs_find_room"))),C.rn2(ai))):C.rn2(ai))))*4),"int").value);
            C.free(rmarr);
            return (C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(i)*C.sizes["struct mkroom"]);
        }
    }
    C.free(rmarr);
    (croom=(C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),2243,(C.literal("generate_stairs_find_room"))),C.rn2(C.field(C.svn,"instance_globals_saved_n","nroom").value))):C.rn2(C.field(C.svn,"instance_globals_saved_n","nroom").value))))*C.sizes["struct mkroom"]));
    return croom;
}

/* construct stairs up and down within the same branch,
   up and down in different rooms if possible */
export function generate_stairs()
{
    const stackFrame=C.stackSave();
    try {
    /* generate_stairs_find_room() returns Null if nroom == 0, but that
       should never happen for a rooms+corridors style level */
    
    let croom;
    let pos=C.stackAlloc(C.sizes["struct nhcoord"]);
    if(Number(!(C.Is_botlevel(C.field(C.u,"you","uz").address)))) {
        if(Number(((croom=generate_stairs_find_room()))==(0))) C.variadic(18,C.staticAddress("gen_stairs_panic"),C.field(C.svn,"instance_globals_saved_n","nroom").value);
        if(Number(!(C.somexyspace(croom,pos)))) {
            (C.field(pos,"nhcoord","x").value=C.i16(C.somex(croom)));
            (C.field(pos,"nhcoord","y").value=C.i16(C.somey(croom)));
        }
        mkstairs(C.field(pos,"nhcoord","x").value,C.field(pos,"nhcoord","y").value,C.i8(0),croom,(C.i8(0)));
        /* down */
    }
    if(Number(C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dlevel").value)!=1)) {
        /* if there is only 1 room and we found it above, this will find
           it again */
        if(Number(((croom=generate_stairs_find_room()))==(0))) C.variadic(19,C.staticAddress("gen_stairs_panic"),C.field(C.svn,"instance_globals_saved_n","nroom").value);
        if(Number(!(C.somexyspace(croom,pos)))) {
            (C.field(pos,"nhcoord","x").value=C.i16(C.somex(croom)));
            (C.field(pos,"nhcoord","y").value=C.i16(C.somey(croom)));
        }
        mkstairs(C.field(pos,"nhcoord","x").value,C.field(pos,"nhcoord","y").value,C.i8(1),croom,(C.i8(0)));
        /* up */
    }
    } finally {C.stackRestore(stackFrame); }
}

export function mkfount(croom)
{
    croom=C.ptr(croom);
    const stackFrame=C.stackSave();
    try {
    let m=C.stackAlloc(C.sizes["struct nhcoord"]);
    if(Number(!(find_okay_roompos(croom,m)))) return;
    /* Put a fountain at m.x, m.y */
    if(Number(!(C.set_levltyp(C.field(m,"nhcoord","x").value,C.field(m,"nhcoord","y").value,C.i8(C.FOUNTAIN))))) return;
    /* Is it a "blessed" fountain? (affects drinking from fountain) */
    if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),2296,(C.literal("mkfount"))),C.rn2(7))):C.rn2(7)))))) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(m,"nhcoord","x").value)*(C.sizes["struct rm"]*21))+Number(C.field(m,"nhcoord","y").value)*C.sizes["struct rm"]),"rm","horizontal").value=C.u32(1));
    ((C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","nfountains").value=C.u8((C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","nfountains").value+1)))-1);
    } finally {C.stackRestore(stackFrame); }
}

export function find_okay_roompos(croom,crd)
{
    croom=C.ptr(croom);
    crd=C.ptr(crd);
    let tryct=0;
    do {
        if(Number((tryct=C.i32((tryct+1)))>200)) return (C.i8(0));
        if(Number(!(C.somexyspace(croom,crd)))) return (C.i8(0));
    } while(Number(!!(C.i32(occupied(C.field(crd,"nhcoord","x").value,C.field(crd,"nhcoord","y").value))||C.i32(bydoor(C.field(crd,"nhcoord","x").value,C.field(crd,"nhcoord","y").value)))));
    return (C.i8(1));
}

export function mksink(croom)
{
    croom=C.ptr(croom);
    const stackFrame=C.stackSave();
    try {
    let m=C.stackAlloc(C.sizes["struct nhcoord"]);
    if(Number(!(find_okay_roompos(croom,m)))) return;
    /* Put a sink at m.x, m.y */
    if(Number(!(C.set_levltyp(C.field(m,"nhcoord","x").value,C.field(m,"nhcoord","y").value,C.i8(C.SINK))))) return;
    ((C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","nsinks").value=C.u8((C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","nsinks").value+1)))-1);
    } finally {C.stackRestore(stackFrame); }
}

export function mkaltar(croom)
{
    croom=C.ptr(croom);
    const stackFrame=C.stackSave();
    try {
    let m=C.stackAlloc(C.sizes["struct nhcoord"]);
    let al;
    if(Number(C.i32(C.field(croom,"mkroom","rtype").value)!=C.OROOM)) return;
    if(Number(!(find_okay_roompos(croom,m)))) return;
    /* Put an altar at m.x, m.y */
    if(Number(!(C.set_levltyp(C.field(m,"nhcoord","x").value,C.field(m,"nhcoord","y").value,C.i8(C.ALTAR))))) return;
    /* -1 - A_CHAOTIC, 0 - A_NEUTRAL, 1 - A_LAWFUL */
    (al=C.i8(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),2348,(C.literal("mkaltar"))),C.rn2(C.i32((1+2))))):C.rn2(C.i32((1+2)))))-1))));
    (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(m,"nhcoord","x").value)*(C.sizes["struct rm"]*21))+Number(C.field(m,"nhcoord","y").value)*C.sizes["struct rm"]),"rm","flags").value=(C.u32((((Number(C.i32((al))==(C.i32((-128)))))?0:((Number(C.i32((al))==1))?4:(C.i32((C.i32((al))+2)))))))));
    } finally {C.stackRestore(stackFrame); }
}

export function mkgrave(croom)
{
    croom=C.ptr(croom);
    const stackFrame=C.stackSave();
    try {
    let m=C.stackAlloc(C.sizes["struct nhcoord"]);
    let tryct=0;
    let otmp;
    let dobell=C.i8(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),2358,(C.literal("mkgrave"))),C.rn2(10))):C.rn2(10))))));
    if(Number(C.i32(C.field(croom,"mkroom","rtype").value)!=C.OROOM)) return;
    if(Number(!(find_okay_roompos(croom,m)))) return;
    /* Put a grave at <m.x,m.y> */
    C.make_grave(C.field(m,"nhcoord","x").value,C.field(m,"nhcoord","y").value,(C.i32(dobell)?C.literal("Saved by the bell!"):0));
    /* Possibly fill it with objects */
    if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),2370,(C.literal("mkgrave"))),C.rn2(3))):C.rn2(3)))))) {
        /* this used to use mkgold(), which puts a stack of gold on
           the ground (or merges it with an existing one there if
           present), and didn't bother burying it; now we create a
           loose, easily buriable, stack but we make no attempt to
           replicate mkgold()'s level-based formula for the amount */
        let gold=C.mksobj(C.GOLD_PIECE,(C.i8(1)),(C.i8(0)));
        (C.field(gold,"obj","quan").value=C.i64((C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),2378,(C.literal("mkgrave"))),C.rnd(20))):C.rnd(20)))+C.i32((C.i32(C.level_difficulty())*((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),2378,(C.literal("mkgrave"))),C.rnd(5))):C.rnd(5))))))))));
        (C.field(gold,"obj","owt").value=C.u32(C.weight(gold)));
        ((C.field(gold,"obj","ox").value=C.field(m,"nhcoord","x").value),(C.field(gold,"obj","oy").value=C.field(m,"nhcoord","y").value));
        C.add_to_buried(gold);
    }
    for((tryct=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),2383,(C.literal("mkgrave"))),C.rn2(5))):C.rn2(5))));tryct;((tryct=C.i32((tryct-1)))+1)) {
        (otmp=C.mkobj(C.RANDOM_CLASS,(C.i8(1))));
        if(Number(!(otmp))) return;
        C.curse(otmp);
        (C.field(otmp,"obj","ox").value=C.field(m,"nhcoord","x").value);
        (C.field(otmp,"obj","oy").value=C.field(m,"nhcoord","y").value);
        C.add_to_buried(otmp);
    }
    /* Leave a bell, in case we accidentally buried someone alive */
    if(dobell) C.mksobj_at(C.BELL,C.field(m,"nhcoord","x").value,C.field(m,"nhcoord","y").value,(C.i8(1)),(C.i8(0)));
    return;
    } finally {C.stackRestore(stackFrame); }
}

/*
 * Major level transmutation:  add a set of stairs (to the Sanctum) after
 * an earthquake that leaves behind a new topology, centered at inv_pos.
 * Assumes there are no rooms within the invocation area and that svi.inv_pos
 * is not too close to the edge of the map.  Also assume the hero can see,
 * which is guaranteed for normal play due to the fact that sight is needed
 * to read the Book of the Dead.  [That assumption is not valid; it is
 * possible that "the Book reads the hero" rather than vice versa if
 * attempted while blind (in order to make blind-from-birth conduct viable).]
 */
export function mkinvokearea()
{
    let dist; let wallct;
    let xmin; let xmax; let ymin; let ymax;
    let i;
    /* slightly odd if levitating, but not wrong */
    C.variadic(20,C.literal("floor shakes violently under you!"));
    /* decide whether to issue the crumbling walls message */
{
        (xmin=(xmax=C.field(C.field(C.svi,"instance_globals_saved_i","inv_pos").address,"nhcoord","x").value));
        (ymin=(ymax=C.field(C.field(C.svi,"instance_globals_saved_i","inv_pos").address,"nhcoord","y").value));
        (wallct=mkinvk_check_wall(xmin,ymin));
        /* this replicates the somewhat convoluted loop below, working
           out from the stair position, except for stopping early when
           walls are found */
        for((dist=1);Number(!!(Number(!(wallct))&&Number(dist<7)));(dist=C.i32((dist+1)))) {
            (((xmin=C.i16((xmin-1)))+1),((xmax=C.i16((xmax+1)))-1));
            /* top and bottom */
            if(Number(dist!=3)) {
                /* the area is wider that it is high */
                (((ymin=C.i16((ymin-1)))+1),((ymax=C.i16((ymax+1)))-1));
                for((i=C.i16(C.i32((C.i32(xmin)+1))));Number(C.i32(i)<C.i32(xmax));((i=C.i16((i+1)))-1)) {
                    if(mkinvk_check_wall(i,ymin)) (wallct=C.i32((wallct+1)));
                    /* we could break after finding first wall
                                   * but it isn't a significant optimization
                                   * for code which only executes once */
                    if(mkinvk_check_wall(i,ymax)) (wallct=C.i32((wallct+1)));
                }
            }
            /* left and right */
            if(Number(!(wallct))) {
                /* skip y loop if x loop found any walls */
                for((i=ymin);Number(C.i32(i)<=C.i32(ymax));((i=C.i16((i+1)))-1)) {
                    if(mkinvk_check_wall(xmin,i)) (wallct=C.i32((wallct+1)));
                    if(mkinvk_check_wall(xmax,i)) (wallct=C.i32((wallct+1)));
                }
            }
        }
        /* message won't appear if the maze 'walls' on this level are lava
           or if all the walls within range have been dug away; when it does
           appear, it will describe iron bars as "walls" (which is ok) */
        if(wallct) C.variadic(21,C.literal("walls around you begin to bend and crumble!"));
    }    C.indirect(0,(C.field(C.windowprocs,"window_procs","win_display_nhwindow").value),C.global("WIN_MESSAGE").value,(C.i8(1)));
    /* any trap hero is stuck in will be going away now */
    if(C.field(C.u,"you","utrap").value) {
        if(Number(C.field(C.u,"you","utraptype").value==C.u32(C.TT_BURIEDBALL))) C.buried_ball_to_punishment();
        C.reset_utrap((C.i8(0)));
    }
    (xmin=(xmax=C.field(C.field(C.svi,"instance_globals_saved_i","inv_pos").address,"nhcoord","x").value));
    /* reset after the check for walls */
    (ymin=(ymax=C.field(C.field(C.svi,"instance_globals_saved_i","inv_pos").address,"nhcoord","y").value));
    mkinvpos(xmin,ymin,0);
    /* middle, before placing stairs */
    for((dist=1);Number(dist<7);((dist=C.i32((dist+1)))-1)) {
        ((xmin=C.i16((xmin-1)))+1);
        ((xmax=C.i16((xmax+1)))-1);
        /* top and bottom */
        if(Number(dist!=3)) {
            /* the area is wider that it is high */
            ((ymin=C.i16((ymin-1)))+1);
            ((ymax=C.i16((ymax+1)))-1);
            for((i=C.i16(C.i32((C.i32(xmin)+1))));Number(C.i32(i)<C.i32(xmax));((i=C.i16((i+1)))-1)) {
                mkinvpos(i,ymin,dist);
                mkinvpos(i,ymax,dist);
            }
        }
        /* left and right */
        for((i=ymin);Number(C.i32(i)<=C.i32(ymax));((i=C.i16((i+1)))-1)) {
            mkinvpos(xmin,i,dist);
            mkinvpos(xmax,i,dist);
        }
        C.flush_screen(1);
        /* make sure the new glyphs shows up */
        C.indirect(1,(C.field(C.windowprocs,"window_procs","win_delay_output").value));
    }
    C.variadic(22,C.literal("are standing at the top of a stairwell leading down!"));
    mkstairs(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,C.i8(0),0,(C.i8(0)));
    /* down */
    C.newsym(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
    (C.field(C.gv,"instance_globals_v","vision_full_recalc").value=C.i8(1));
    /* everything changed */
}

/* Change level topology.  Boulders in the vicinity are eliminated.
 * Temporarily overrides vision in the name of a nice effect.
 */
export function mkinvpos(x,y,dist)
{
    x=C.i16(x);
    y=C.i16(y);
    dist=C.i32(dist);
    let ttmp;
    let otmp;
    let make_rocks;
    let lev=((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]);
    let mon;
    /* maze levels have slightly different constraints from normal levels;
       these are also defined in mkmaze.c and may not be appropriate for
       mazes with corridors wider than 1 or for cavernous levels */
    /* clip at existing map borders if necessary */
    if(Number(!((Number(!!(Number(!!(Number(!!(Number(C.i32((x))>=(2))&&Number(C.i32((x))<=(C.field(C.gx,"instance_globals_x","x_maze_max").value))))&&Number(C.i32((y))>=(2))))&&Number(C.i32((y))<=(C.field(C.gy,"instance_globals_y","y_maze_max").value)))))))) {
        /* outermost 2 columns and/or rows may be truncated due to edge */
        if(Number(dist<(C.i32((7-2))))) {
            /* panic() or impossible() */
            let errfunc;
            (errfunc=(Number(!(C.isok(x,y)))?"panic":"impossible"));
            C.dynamicVariadic((errfunc),0,C.literal("mkinvpos: <%d,%d> (%d) off map edge!"),C.i32(x),C.i32(y),dist);
        }
        return;
    }
    /* clear traps */
    if(Number(((ttmp=C.t_at(x,y)))!=0)) C.deltrap(ttmp);
    /* clear boulders; leave some rocks for non-{moat|trap} locations */
    (make_rocks=C.i8(((Number(!!(Number(!!(Number(dist!=1)&&Number(dist!=4)))&&Number(dist!=5))))?C.i32((C.i8(1))):C.i32((C.i8(0))))));
    while(Number(((otmp=C.sobj_at(C.BOULDER,x,y)))!=0)) {
        if(make_rocks) {
            C.fracture_rock(otmp);
            (make_rocks=(C.i8(0)));
            /* don't bother with more rocks */
        } else {
            C.obj_extract_self(otmp);
            C.obfree(otmp,0);
        }
    }
    /* fake out saved state */
    (C.field(lev,"rm","seenv").value=C.u8(0));
    (C.field(lev,"rm","flags").value=C.u32(0));
    if(Number(dist<6)) (C.field(lev,"rm","lit").value=C.u32((C.i8(1))));
    (C.field(lev,"rm","waslit").value=C.u32((C.i8(1))));
    (C.field(lev,"rm","horizontal").value=C.u32((C.i8(0))));
    /* short-circuit vision recalc */
    (C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(y)*8),"unsigned char *").value+Number(x)*1),"unsigned char").value=C.u8(((Number(dist<6))?(C.i32((2|1))):1)));
    switch(dist) {
        case (1):
            /* fire traps */
            if(C.is_pool(x,y)) break;
        (C.field(lev,"rm","typ").value=C.i8(C.ROOM));
        (ttmp=C.maketrap(x,y,C.FIRE_TRAP));
        if(ttmp) (C.field(ttmp,"trap","tseen").value=C.u32((C.i8(1))));
        break;
        case (0):
            /* lit room locations */
            case (2):
                case (3):
                    case (6):
                        /* unlit room locations */
                        (C.field(lev,"rm","typ").value=C.i8(C.ROOM));
        break;
        case (4):
            /* pools (aka a wide moat) */
            case (5):
                (C.field(lev,"rm","typ").value=C.i8(C.MOAT));
        /* No kelp! */
        break;
        default:
            C.variadic(23,C.literal("mkinvpos called with dist %d"),dist);
        break;
    }
    if(Number(((mon=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value)))!=0)) {
        /* wake up mimics, don't want to deal with them blocking vision */
        if(C.field(mon,"monst","m_ap_type").value) C.seemimic(mon);
        if(Number(((ttmp=C.t_at(x,y)))!=0)) C.mintrap(mon,0);
 else C.minliquid(mon);
    }
    if(Number(!(C.does_block(C.i32(x),C.i32(y),lev)))) C.unblock_point(C.i32(x),C.i32(y));
    /* make sure vision knows location is open */
    /* display new value of position; could have a monster/object on it */
    C.newsym(x,y);
}

/* reduces clutter in mkinvokearea() while avoiding potential static analyzer
   confusion about using isok(x,y) to control access to levl[x][y] */
export function mkinvk_check_wall(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let ltyp;
    if(Number(!(C.isok(x,y)))) return 0;
    ((Number(!!((Number(!!(Number(C.i32(x)>0)&&Number(C.i32(x)<80))))||((C.__assert_fail(C.literal("x > 0 && x < COLNO"),C.literal("mklev.c"),2609,(C.literal("mkinvk_check_wall"))),0))))));
    ((Number(!!((Number(!!(Number(C.i32(y)>=0)&&Number(C.i32(y)<21))))||((C.__assert_fail(C.literal("y >= 0 && y < ROWNO"),C.literal("mklev.c"),2610,(C.literal("mkinvk_check_wall"))),0))))));
    (ltyp=C.u32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value));
    return ((Number(!!((Number((ltyp)<=C.u32(C.DBWALL)))||Number(ltyp==C.u32(C.IRONBARS)))))?1:0);
}

/*
 * The portal to Ludios is special.  The entrance can only occur within a
 * vault in the main dungeon at a depth greater than 10.  The Ludios branch
 * structure reflects this by having a bogus "source" dungeon:  the value
 * of n_dgns (thus, Is_branchlev() will never find it).
 *
 * Ludios will remain isolated until the branch is corrected by this function.
 */
export function mk_knox_portal(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let source;
    let br;
    let u_depth;
    (br=C.dungeon_branch(C.literal("Fort Ludios")));
    /* dungeon_branch() panics (so never returns) if result would be Null */
    ((Number(!!((Number(br!=(0)))||((C.__assert_fail(C.literal("br != NULL"),C.literal("mklev.c"),2632,(C.literal("mk_knox_portal"))),0))))));
    if(C.on_level(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address,C.field(br,"branch","end1").address)) {
        (source=C.field(br,"branch","end2").address);
    } else {
        /* disallow Knox branch on a level with one branch already */
        if(C.Is_branchlev(C.field(C.u,"you","uz").address)) return;
        (source=C.field(br,"branch","end1").address);
    }
    /* Already set or 2/3 chance of deferring until a later level. */
    if(Number(!!(Number(C.i32(C.field(source,"d_level","dnum").value)<C.field(C.svn,"instance_globals_saved_n","n_dgns").value)||(Number(!!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mklev.c"),2644,(C.literal("mk_knox_portal"))),C.rn2(3))):C.rn2(3)))&&Number(!(C.field(C.flags,"flag","debug").value)))))))) return;
    if(Number(!((Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value)==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_oracle_level").address,"d_level","dnum").value))&&Number(!(C.at_dgn_entrance(C.literal("The Quest"))))))&&Number(C.i32(((u_depth=C.depth(C.field(C.u,"you","uz").address))))>10)))&&Number(C.i32(u_depth)<C.i32(C.depth(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_medusa_level").address))))))))) return;
    /* in main dungeon */
    /* but not Quest's entry */
    /* beneath 10 */
    /* and above Medusa */
    /* Adjust source to be current level and re-insert branch. */
    C.copy(source,C.field(C.u,"you","uz").address,C.sizes["struct d_level"]);
    C.insert_branch(br,(C.i8(1)));
    do {
        if(C.debugcore(C.literal("mklev.c"),(C.i8(1)))) {
            let save_plnmsg=C.field(C.iflags,"instance_flags","last_msg").value;
            C.variadic(24,C.literal("Made knox portal."));
            (C.field(C.iflags,"instance_flags","last_msg").value=save_plnmsg);
        }
    } while(0);
    place_branch(br,x,y);
}

/*mklev.c*/
export const mklevStaticInitializers = C => [
    {name:"trap_engravings",type:"char *[26]",size:(8*26),values:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,C.literal("Vlad was here"),C.literal("ad aerarium"),C.literal("ad aerarium"),0,0,0,0,0,0,0,0,0]},
    {name:"zerorm",type:"struct rm",size:C.sizes["struct rm"],values:[C.GLYPH_UNEXPLORED_OFF,C.i8(0),C.u8(0),C.u32(0),C.u32(0),C.u32(0),C.u32(0),C.u32(0),C.u32(0),C.u32(0)]},
    {name:"supply_items",type:"int[9]",size:(4*9),values:[C.POT_EXTRA_HEALING,C.POT_SPEED,C.POT_GAIN_ENERGY,C.SCR_ENCHANT_WEAPON,C.SCR_ENCHANT_ARMOR,C.SCR_CONFUSE_MONSTER,C.SCR_SCARE_MONSTER,C.WAN_DIGGING,C.SPE_HEALING]},
    {name:"extra_classes",type:"int[10]",size:(4*10),values:[C.FOOD_CLASS,C.WEAPON_CLASS,C.ARMOR_CLASS,C.GEM_CLASS,C.SCROLL_CLASS,C.POTION_CLASS,C.RING_CLASS,(C.i32((0-C.SPBOOK_CLASS))),(C.i32((0-C.SPBOOK_CLASS))),(C.i32((0-C.SPBOOK_CLASS)))]},
    {name:"mktrap_err",type:"int",size:4,values:0},
    {name:"gen_stairs_panic",type:"char[45]",size:(1*45),values:C.literal("generate_stairs: failed to find a room! (%d)")},
];
