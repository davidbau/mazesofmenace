/* NetHack 5.0	engrave.c	$NHDT-Date: 1737345573 2025/01/19 19:59:33 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.165 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2012. */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from '../c-runtime/context.js';

/* doengrave() data */
// Native context layout is generated separately for C addressability.
/* TRUE if we wipe out the current engraving */
/* TRUE if engraving blinds the player */
/* TRUE if we identify the stylus */
/* TRUE if we are overwriting oep */
/* TRUE if we are engraving in slime */
/* TRUE if we must prompt for engrave text */
/* TRUE if we move the old engraving */
/* TRUE if we remove a wand charge */
/* TRUE if the display needs a refresh */
/* TRUE if engraving on ice */
/* TRUE if adding to existing engraving */
/* doengrave return value */
/* Type of engraving made */
/* will be set to type of current engraving */
/* Object selected with which to engrave */
/* The current engraving */
/* Buffer for final/poly engraving text */
/* Buffer for initial engraving text */
/* Buffer for "your fingers" */
/* Buffer for query text */
/* Text displayed after engraving prompt */
/* text of item used for writing */
/* Present tense of engraving type */
/* Where the engraving is (ie dust/floor/...) */
/* # of nonspace chars of new engraving text */
// #ifndef C.SFCTOOL (active game configuration)

export function random_engraving(outbuf, pristine_copy)
{
    let rumor;

    /* a random engraving may come from the "rumors" file,
       or from the "engrave" file (formerly in an array here) */
    if (!C.rn2(4, 57, 'random_engraving') || !(rumor = C.getrumor(0, pristine_copy, 1)) || !C.loadChar(rumor))
        C.get_rnd_text(C.ENGRAVEFILE, pristine_copy, C.rn2, C.MD_PAD_RUMORS);

    C.Strcpy(outbuf, pristine_copy);
    wipeout_text(outbuf, C.int(C.strlen(outbuf) / 4n), 0);
    return outbuf;
}

/* Partial rubouts for engraving characters. -3. */
export const rubouts = [
    { wipefrom: 65, wipeto: "^" },
    { wipefrom: 66, wipeto: "Pb[" },
    { wipefrom: 67, wipeto: "(" },
    { wipefrom: 68, wipeto: "|)[" },
    { wipefrom: 69, wipeto: "|FL[_" },
    { wipefrom: 70, wipeto: "|-" },
    { wipefrom: 71, wipeto: "C(" },
    { wipefrom: 72, wipeto: "|-" },
    { wipefrom: 73, wipeto: "|" },
    { wipefrom: 75, wipeto: "|<" },
    { wipefrom: 76, wipeto: "|_" },
    { wipefrom: 77, wipeto: "|" },
    { wipefrom: 78, wipeto: "|\\" },
    { wipefrom: 79, wipeto: "C(" },
    { wipefrom: 80, wipeto: "F" },
    { wipefrom: 81, wipeto: "C(" },
    { wipefrom: 82, wipeto: "PF" },
    { wipefrom: 84, wipeto: "|" },
    { wipefrom: 85, wipeto: "J" },
    { wipefrom: 86, wipeto: "/\\" },
    { wipefrom: 87, wipeto: "V/\\" },
    { wipefrom: 90, wipeto: "/" },
    { wipefrom: 98, wipeto: "|" },
    { wipefrom: 100, wipeto: "c|" },
    { wipefrom: 101, wipeto: "c" },
    { wipefrom: 103, wipeto: "c" },
    { wipefrom: 104, wipeto: "n" },
    { wipefrom: 106, wipeto: "i" },
    { wipefrom: 107, wipeto: "|" },
    { wipefrom: 108, wipeto: "|" },
    { wipefrom: 109, wipeto: "nr" },
    { wipefrom: 110, wipeto: "r" },
    { wipefrom: 111, wipeto: "c" },
    { wipefrom: 113, wipeto: "c" },
    { wipefrom: 119, wipeto: "v" },
    { wipefrom: 121, wipeto: "v" },
    { wipefrom: 58, wipeto: "." },
    { wipefrom: 59, wipeto: ",:" },
    { wipefrom: 44, wipeto: "." },
    { wipefrom: 61, wipeto: "-" },
    { wipefrom: 43, wipeto: "-|" },
    { wipefrom: 42, wipeto: "+" },
    { wipefrom: 64, wipeto: "0" },
    { wipefrom: 48, wipeto: "C(" },
    { wipefrom: 49, wipeto: "|" },
    { wipefrom: 54, wipeto: "o" },
    { wipefrom: 55, wipeto: "/" },
    { wipefrom: 56, wipeto: "3o" },
];

/* degrade some of the characters in a string */
export function wipeout_text(engr, cnt, seed) /* engraving text */ /* number of chars to degrade */ /* for semi-controlled randomization */
{
    seed = C.uint(seed); // Original unsigned parameter conversion.
    let s;
    let i, j, nxt, use_rubout;
    let lth = C.uint(C.strlen(engr));

    if (lth && cnt > 0) {
        while (cnt--) {
            /* pick next character */
            if (!seed) {
                /* random */
                nxt = C.rn2(C.int(lth), 134, 'wipeout_text');
                use_rubout = C.rn2(4, 135, 'wipeout_text');
            } else {
                /* predictable; caller can reproduce the same sequence by
                   supplying the same arguments later, or a pseudo-random
                   sequence by varying any of them */
                nxt = seed % lth;
                seed = C.uint(seed * 31), seed %= (C.BUFSZ - 1);
                use_rubout = seed & 3;
            }
            s = (engr + nxt);
            if (C.loadChar(s) == 32)
                continue;

            /* rub out unreadable & small punctuation marks */
            if (C.strchr("?.,'`-|_", C.loadChar(s))) {
                C.storeChar(s, 32);
                continue;
            }

            if (!use_rubout) {
                i = C.rubouts.length;
            } else {
                for (i = 0; i < C.rubouts.length; i++)
                    if (C.loadChar(s) == C.rubouts[i].wipefrom) {
                        let ln = C.uint(C.strlen(C.rubouts[i].wipeto));
                        /*
                         * Pick one of the substitutes at random.
                         */
                        if (!seed) {
                            j = C.rn2(C.int(ln), 164, 'wipeout_text');
                        } else {
                            seed = C.uint(seed * 31), seed %= (C.BUFSZ - 1);
                            j = seed % ln;
                        }
                        C.storeChar(s, C.loadChar(C.rubouts[i].wipeto + j));
                        break;
                    }
            }

            /* didn't pick rubout; use '?' for unreadable character */
            if (i == C.rubouts.length)
                C.storeChar(s, 63);
        }
    }

    /* trim trailing spaces */
    while (lth && C.loadChar(engr + (lth - 1)) == 32)
        C.storeChar(engr + (--lth), 0);
}

/* check whether hero can reach something at ground level */
export function can_reach_floor(check_pit)
{
    let t;

    if (C.u.uswallow
        || (C.u.ustuck && !C.sticks(C.gy.youmonst.data)
            /* assume that arms are pinned rather than that the hero
               has been lifted up above the floor [doesn't explain
               how hero can attack the creature holding him or her;
               that's life in nethack...] */
            && C.attacktype(C.u.ustuck.data, C.AT_HUGS))
        || (C.Levitation && !(C.Is_airlevel(C.u.uz) || C.Is_waterlevel(C.u.uz))))
        return 0;
    /* Restricted/unskilled riders can't reach the floor */
    if (C.u.usteed && C.P_SKILL(C.P_RIDING) < C.P_BASIC)
        return 0;
    if (C.u.uundetected && C.ceiling_hider(C.gy.youmonst.data))
        return 0;

    if (C.Flying || C.gy.youmonst.data.msize >= C.MZ_HUGE)
        return 1;

    if (check_pit && (t = C.t_at(C.u.ux, C.u.uy)) != 0
        && (C.uteetering_at_seen_pit(t) || C.uescaped_shaft(t)))
        return 0;

    return 1;
}

/* give a message after caller has determined that hero can't reach */
export function cant_reach_floor(x, y, up, check_pit, wand_engraving)
{
    C.pline("%s can't reach the %s.",
          wand_engraving
              ? "The wand does nothing more, and the tip of the wand"
              : "You",
          up  ? C.ceiling(x, y)
              : (check_pit && can_reach_floor(0)) ? "bottom of the pit"
                                                      : C.surface(x, y));
}

export function engr_at(x, y)
{
    let ep = C.head_engr;

    while (ep) {
        if (x == ep.engr_x && y == ep.engr_y)
            return ep;
        ep = ep.nxt_engr;
    }
    return 0;
}

/* Decide whether a particular string is engraved at a specified
 * location; a case-insensitive substring match is used.
 * Ignore headstones, in case the player names herself "Elbereth".
 *
 * If strict checking is requested, the word is only considered to be
 * present if it is intact and is the entire content of the engraving.
 */
export function sengr_at(s, x, y, strict)
{
    let ep = engr_at(x, y);

    if (ep && ep.engr_type != C.HEADSTONE && ep.engr_time <= C.svm.moves) {
        if (strict ? !C.strcmpi(ep.engr_txt[C.actual_text], s)
                   : (C.strstri(ep.engr_txt[C.actual_text], s) != 0))
            return ep;
    }
    return 0;
}

export function u_wipe_engr(cnt)
{
    if (can_reach_floor(1))
        wipe_engr_at(C.u.ux, C.u.uy, cnt, 0);
}

export function wipe_engr_at(x, y, cnt, magical)
{
    cnt = C.short(cnt); // Original xint16 parameter conversion, also for direct JS callers.
    let ep = engr_at(x, y);

    /* Headstones and some specially marked engravings are indelible */
    if (ep && ep.engr_type != C.HEADSTONE && !ep.nowipeout) {
        if (C.config_DEBUG && C.debugcore("engrave.c", 1)) {
            const save_plnmsg = C.iflags.last_msg;
            C.pline("asked to erode %d characters", cnt);
            C.iflags.last_msg = save_plnmsg;
        }
        if (ep.engr_type != C.BURN || C.is_ice(x, y) || (magical && !C.rn2(2, 278, 'wipe_engr_at'))) {
            if (ep.engr_type != C.DUST && ep.engr_type != C.ENGR_BLOOD) {
                cnt = C.rn2(1 + Math.trunc(50 / (cnt + 1)), 280, 'wipe_engr_at') ? 0 : 1;
                if (C.config_DEBUG && C.debugcore("engrave.c", 1)) {
            const save_plnmsg = C.iflags.last_msg;
            C.pline("actually eroding %d characters", cnt);
            C.iflags.last_msg = save_plnmsg;
        }
            }
            wipeout_text(ep.engr_txt[C.actual_text], C.int(cnt), 0);
            while (C.loadChar(ep.engr_txt[C.actual_text] + (0)) == 32)
                ep.engr_txt[C.actual_text]++;
            if (!C.loadChar(ep.engr_txt[C.actual_text] + (0)))
                del_engr(ep);
        }
    }
}

/*
 * Returns:
 *    non-zero if it can be felt
 */
export function engr_can_be_felt(ep)
{
    let canfeel = 0;

    switch (ep.engr_type) {
        case C.ENGRAVE:
        case C.HEADSTONE:
        case C.BURN:
            canfeel = 1;
            break;
        case C.DUST:
        case C.MARK:
        case C.ENGR_BLOOD:
        default:
            canfeel = 0;
            break;
    }
    return canfeel;
}

export function read_engr_at(x, y)
{
    let ep = engr_at(x, y);
    let eloc = C.surface(x, y);
    let sensed = 0;

    /* Sensing an engraving does not require sight for some engraving types,
     * nor does it necessarily imply comprehension (literacy).
     */
    if (ep && C.loadChar(ep.engr_txt[C.actual_text] + (0))) {
        switch (ep.engr_type) {
        case C.DUST:
            if (!C.Blind) {
                sensed = 1;
                C.pline("%s is written here in the %s.", C.Something,
                      C.is_ice(x, y) ? "frost" : "dust");
            }
            break;
        case C.ENGRAVE:
        case C.HEADSTONE:
            if (!C.Blind || can_reach_floor(1)) {
                sensed = 1;
                C.pline("%s is engraved here on the %s.", C.Something, eloc);
            }
            break;
        case C.BURN:
            if (!C.Blind || can_reach_floor(1)) {
                sensed = 1;
                C.pline("Some text has been %s into the %s here.",
                      C.is_ice(x, y) ? "melted" : "burned", eloc);
            }
            break;
        case C.MARK:
            if (!C.Blind) {
                sensed = 1;
                C.pline("There's some graffiti on the %s here.", eloc);
            }
            break;
        case C.ENGR_BLOOD:
            /* "It's a message!  Scrawled in blood!"
             * "What's it say?"
             * "It says... `See you next Wednesday.'" -- Thriller
             */
            if (!C.Blind) {
                sensed = 1;
                C.You_see("a message scrawled in blood here.");
            }
            break;
        default:
            C.impossible("%s is written in a very strange way.", C.Something);
            sensed = 1;
        }

        if (sensed) {
            let et; const buf = C.stackAlloc(C.BUFSZ);
            let endpunct;
            let maxelen = C.int(C.BUFSZ
                                 /* sizeof "literal" counts terminating \0 */
                                 - C.ReadPrefixSize),
                elen = C.int(C.strlen(ep.engr_txt[C.actual_text])),
                off = C.int(C.ptrDiff(ep.engr_txt[C.actual_text], C.engr_text_space(ep)));

            if (elen > maxelen) {
                C.strncpy(buf, ep.engr_txt[C.actual_text], maxelen);
                C.storeChar(buf + (maxelen), 0);
                et = buf;
                elen = maxelen;
            } else {
                et = ep.engr_txt[C.actual_text];
            }
            endpunct = "";
            if (elen < 2
                /* only skip if punctuation is original, not degraded char */
                || !((C.loadChar(ep.engr_txt[C.pristine_text] + (off + elen - 1))
                      == C.loadChar(et + (elen - 1)))
                     && C.strchr(".!?", C.loadChar(et + (elen - 1))))) {
                endpunct = ".";
            }
            C.You("%s: \"%s\"%s", (C.Blind) ? "feel the words" : "read", et,
                endpunct);
            C.Strcpy(ep.engr_txt[C.remembered_text], ep.engr_txt[C.actual_text]);
            ep.eread = 1;
            ep.erevealed = 1;
            if (C.svc.context.run > 0)
                C.nomul(0);
        }
    }
}

export function make_engr_at(x, y, s, pristine_s, e_time, e_type)
{
    let i;
    let ep;
    let smem = C.Strlen(s, 0) + 1;
    let havepristine = 0;

    if (pristine_s != 0) {
        let prmem = C.Strlen(pristine_s, 1) + 1;
        if (prmem > smem)
            smem = prmem;
        havepristine = 1;
    }
    if ((ep = engr_at(x, y)) != 0)
        del_engr(ep);

    ep = C.newengr(smem * 3);
    C.memset(ep, 0, (smem * 3) + C.EngrSize);
    ep.nxt_engr = C.head_engr;
    C.head_engr = ep;
    ep.engr_x = x;
    ep.engr_y = y;
    ep.engr_txt[C.actual_text] = C.engr_text_space(ep);
    ep.engr_txt[C.remembered_text] = ep.engr_txt[C.actual_text] + smem;
    ep.engr_txt[C.pristine_text] = ep.engr_txt[C.remembered_text] + smem;
    for(i = 0; i < C.text_states; ++i)
        C.Strcpy(ep.engr_txt[i], s);
    if (havepristine)
        C.Strcpy(ep.engr_txt[C.pristine_text], pristine_s);
    if (!C.strcmp(s, "Elbereth")) {
        /* engraving "Elbereth":  if done when making a level, it creates
           an old-style Elbereth that deters monsters when any objects are
           present; otherwise (done by the player), exercises wisdom */
        if (C.gi.in_mklev)
            ep.guardobjects = 1;
        else
            C.exercise(C.A_WIS, 1);
    }
    ep.engr_time = e_time;
    ep.engr_type = C.char((e_type > 0) ? e_type : C.rnd(C.N_ENGRAVE - 1, 452, 'make_engr_at'));
    ep.engr_szeach = smem;
    ep.engr_alloc = smem * 3;
    /* we do not set ep->eread or ep->erevealed;
     * the caller will need to if required */
}

/* delete any engraving at location <x,y> */
export function del_engr_at(x, y)
{
    let ep = engr_at(x, y);

    if (ep)
        del_engr(ep);
}

/*
 * freehand - returns true if player has a free hand
 */
export function freehand()
{
    return (!C.uwep || !C.welded(C.uwep)
            || (!C.bimanual(C.uwep) && (!C.uarms || !C.uarms.cursed)));
}

/* getobj callback for an object to engrave with */
export function stylus_ok(obj)
{
    if (!obj)
        return C.GETOBJ_SUGGEST;

    /* Potential extension: exclude weapons that don't make any sense (such as
     * bullwhips) and downplay rings and gems that wouldn't be good to write
     * with (such as glass and non-gem rings) */
    if (obj.oclass == C.WEAPON_CLASS || obj.oclass == C.WAND_CLASS
        || obj.oclass == C.GEM_CLASS || obj.oclass == C.RING_CLASS)
        return C.GETOBJ_SUGGEST;

    /* Only markers and towels are recommended tools. */
    if (obj.oclass == C.TOOL_CLASS
        && (obj.otyp == C.TOWEL || obj.otyp == C.MAGIC_MARKER))
        return C.GETOBJ_SUGGEST;

    return C.GETOBJ_DOWNPLAY;
}

/* can hero engrave at all (at their location)? */
export function u_can_engrave()
{
    let levtyp = C.SURFACE_AT(C.u.ux, C.u.uy);

    if (C.u.uswallow) {
        if (C.is_animal(C.u.ustuck.data)) {
            C.pline("What would you write?  \"Jonah was here\"?");
            return 0;
        } else if (C.is_whirly(C.u.ustuck.data)) {
            cant_reach_floor(C.u.ux, C.u.uy, 0, 0, 0);
            return 0;
        }
        /* Note: for amorphous engulfers, writing attempt is allowed here
           but yields the 'jello' result in doengrave() */
    } else if (C.is_lava(C.u.ux, C.u.uy)) {
        C.You_cant("write on the %s!", C.surface(C.u.ux, C.u.uy));
        return 0;
    } else if (C.is_pool(C.u.ux, C.u.uy) || C.IS_FOUNTAIN(levtyp)) {
        C.You_cant("write on the %s!", C.surface(C.u.ux, C.u.uy));
        return 0;
    } else if (C.IS_AIR(levtyp)) {
        /* airlevel or inside bubble on waterlevel */
        C.You_cant("write in %s!",
                 (levtyp == C.CLOUD) ? "cloud vapor" : "thin air");
        return 0;
    } else if (!C.ACCESSIBLE(levtyp)) {
        /* stone, tree, wall, secret corridor, pool, lava, bars */
        C.You_cant("write here.");
        return 0;
    }

    if (C.cantwield(C.gy.youmonst.data)) {
        C.You_cant("even hold anything!");
        return 0;
    }
    if (C.check_capacity(0))
        return 0;
    return 1;
}

/* initialize the doengrave data */
export function doengrave_ctx_init(de)
{
    de.dengr = 0;
    de.doblind = 0;
    de.doknown = 0;
    de.eow = 0;
    de.ptext = 1;
    de.teleengr = 0;
    de.zapwand = 0;
    de.disprefresh = 0;
    de.adding = 0;

    de.ret = C.ECMD_OK;
    de.type = C.DUST;
    de.oetype = 0;

    de.otmp = 0;
    de.oep = engr_at(C.u.ux, C.u.uy);

    C.storeChar(de.buf + (0), 0);
    C.storeChar(de.ebuf + (0), 0);
    C.storeChar(de.fbuf + (0), 0);
    C.storeChar(de.qbuf + (0), 0);
    C.storeChar(de.post_engr_text + (0), 0);
    de.writer = 0;

    if (de.oep)
        de.oetype = de.oep.engr_type;
    if (C.is_demon(C.gy.youmonst.data) || C.is_vampire(C.gy.youmonst.data))
        de.type = C.ENGR_BLOOD;

    de.jello = (C.u.uswallow && !(C.is_animal(C.u.ustuck.data)
                                 || C.is_whirly(C.u.ustuck.data)));
    de.frosted = C.is_ice(C.u.ux, C.u.uy);
}

/* special engraving effects for WAND objects */
export function doengrave_sfx_item_WAN(de)
{
    switch (de.otmp.otyp) {
        /* DUST wands */
    default:
        break;
        /* NODIR wands */
    case C.WAN_LIGHT:
    case C.WAN_SECRET_DOOR_DETECTION:
    case C.WAN_STASIS:
    case C.WAN_CREATE_MONSTER:
    case C.WAN_WISHING:
    case C.WAN_ENLIGHTENMENT:
        C.zapnodir(de.otmp);
        break;
        /* IMMEDIATE wands */
        /* If wand is "IMMEDIATE", remember to affect the
         * previous engraving even if turning to dust.
         */
    case C.WAN_STRIKING:
        C.Strcpy(de.post_engr_text,
               "The wand unsuccessfully fights your attempt to write!");
        break;
    case C.WAN_SLOW_MONSTER:
        if (!C.Blind) {
            C.Sprintf(de.post_engr_text, "The bugs on the %s slow down!",
                    C.surface(C.u.ux, C.u.uy));
        }
        break;
    case C.WAN_SPEED_MONSTER:
        if (!C.Blind) {
            C.Sprintf(de.post_engr_text, "The bugs on the %s speed up!",
                    C.surface(C.u.ux, C.u.uy));
        }
        break;
    case C.WAN_POLYMORPH:
        if (de.oep) {
            if (!C.Blind) {
                de.type = 0; /* random */
                C.callLocal(random_engraving, de.buf, de.ebuf);
            } else {
                /* keep the same type so that feels don't
                   change and only the text is altered,
                   but you won't know anyway because
                   you're a _blind writer_ */
                if (de.oetype)
                    de.type = de.oetype;
                C.xcrypt(blengr(), de.buf);
            }
            de.dengr = 1;
        }
        break;
    case C.WAN_NOTHING:
    case C.WAN_UNDEAD_TURNING:
    case C.WAN_OPENING:
    case C.WAN_LOCKING:
    case C.WAN_PROBING:
        break;
        /* RAY wands */
    case C.WAN_MAGIC_MISSILE:
        de.ptext = 1;
        if (!C.Blind) {
            C.Sprintf(de.post_engr_text,
                    "The %s is riddled by bullet holes!",
                    C.surface(C.u.ux, C.u.uy));
        }
        break;
        /* can't tell sleep from death - Eric Backus */
    case C.WAN_SLEEP:
    case C.WAN_DEATH:
        if (!C.Blind) {
            C.Sprintf(de.post_engr_text, "The bugs on the %s stop moving!",
                    C.surface(C.u.ux, C.u.uy));
        }
        break;
    case C.WAN_COLD:
        if (!C.Blind)
            C.Strcpy(de.post_engr_text,
                   "A few ice cubes drop from the wand.");
        if (!de.oep || (de.oep.engr_type != C.BURN))
            break;
        
        /*FALLTHRU*/
    case C.WAN_CANCELLATION:
    case C.WAN_MAKE_INVISIBLE:
        if (de.oep && de.oep.engr_type != C.HEADSTONE) {
            if (!C.Blind)
                C.pline_The("engraving on the %s vanishes!",
                          C.surface(C.u.ux, C.u.uy));
            de.dengr = 1;
        }
        break;
    case C.WAN_TELEPORTATION:
        if (de.oep && de.oep.engr_type != C.HEADSTONE) {
            if (!C.Blind)
                C.pline_The("engraving on the %s vanishes!",
                          C.surface(C.u.ux, C.u.uy));
            de.teleengr = 1;
        }
        break;
        /* type = ENGRAVE wands */
    case C.WAN_DIGGING:
        de.ptext = 1;
        de.type = C.ENGRAVE;
        if (!C.objects[de.otmp.otyp].oc_name_known) {
            if (C.flags.verbose)
                C.pline("This %s is a wand of digging!", C.xname(de.otmp));
            de.doknown = 1;
        }
        C.Strcpy(de.post_engr_text,
               (C.Blind && !C.Deaf)
               ? "You hear drilling!"    /* Deaf-aware */
               : C.Blind
                  ? "You feel tremors."
                  : C.IS_GRAVE(C.levl[C.u.ux][C.u.uy].typ)
                     ? "Chips fly out from the headstone."
                     : de.frosted
                        ? "Ice chips fly up from the ice surface!"
                        : (C.svl.level.locations[C.u.ux][C.u.uy].typ
                          == C.DRAWBRIDGE_DOWN)
                           ? "Splinters fly up from the bridge."
                           : "Gravel flies up from the floor.");
        break;
        /* type = BURN wands */
    case C.WAN_FIRE:
        de.ptext = 1;
        de.type = C.BURN;
        if (!C.objects[de.otmp.otyp].oc_name_known) {
            if (C.flags.verbose)
                C.pline("This %s is a wand of fire!", C.xname(de.otmp));
            de.doknown = 1;
        }
        C.Strcpy(de.post_engr_text, C.Blind ? "You feel the wand heat up."
                                         : "Flames fly from the wand.");
        break;
    case C.WAN_LIGHTNING:
        de.ptext = 1;
        de.type = C.BURN;
        if (!C.objects[de.otmp.otyp].oc_name_known) {
            if (C.flags.verbose)
                C.pline("This %s is a wand of lightning!", C.xname(de.otmp));
            de.doknown = 1;
        }
        if (!C.Blind) {
            C.Strcpy(de.post_engr_text, "Lightning arcs from the wand.");
            de.doblind = 1;
        } else {
            C.Strcpy(de.post_engr_text, !C.Deaf
                   ? "You hear crackling!"     /* Deaf-aware */
                   : "Your hair stands up!");
        }
        break;
        /* type = MARK wands */
        /* type = ENGR_BLOOD wands */
    }
}

/* special engraving effects for all objects */
export function doengrave_sfx_item(de)
{
    switch (de.otmp.oclass) {
    default:
    case C.AMULET_CLASS:
    case C.CHAIN_CLASS:
    case C.POTION_CLASS:
    case C.COIN_CLASS:
        break;
    case C.RING_CLASS:
        /* "diamond" rings and others should work */
    case C.GEM_CLASS:
        /* diamonds & other hard gems should work */
        if (C.objects[de.otmp.otyp].oc_tough) {
            de.type = C.ENGRAVE;
            break;
        }
        break;
    case C.ARMOR_CLASS:
        if (C.is_boots(de.otmp)) {
            de.type = C.DUST;
            break;
        }
        
        /*FALLTHRU*/
    /* Objects too large to engrave with */
    case C.BALL_CLASS:
    case C.ROCK_CLASS:
        C.You_cant("engrave with such a large object!");
        de.ptext = 0;
        break;
    /* Objects too silly to engrave with */
    case C.FOOD_CLASS:
    case C.SCROLL_CLASS:
    case C.SPBOOK_CLASS:
        C.pline("%s would get %s.", C.Yname2(de.otmp),
              de.frosted ? "all frosty" : "too dirty");
        de.ptext = 0;
        break;
    case C.RANDOM_CLASS: /* This should mean fingers */
        break;

    /* The charge is removed from the wand before prompting for
     * the engraving text, because all kinds of setup decisions
     * and pre-engraving messages are based upon knowing what type
     * of engraving the wand is going to do.  Also, the player
     * will have potentially seen "You wrest .." message, and
     * therefore will know they are using a charge.
     */
    case C.WAND_CLASS:
        if (C.zappable(de.otmp)) {
            C.check_unpaid(de.otmp);
            if (de.otmp.cursed && !C.rn2(C.WAND_BACKFIRE_CHANCE, 794, 'doengrave_sfx_item')) {
                C.wand_explode(de.otmp, 0);
                de.ret = C.ECMD_TIME;
                return 0;
            }
            de.zapwand = 1;
            if (!can_reach_floor(1))
                de.ptext = 0;
            doengrave_sfx_item_WAN(de);
        } else { /* end if zappable */
            /* failing to wrest one last charge takes time */
            de.ptext = 0; /* use "early exit" below, return 1 */
            /* give feedback here if we won't be getting the
               "can't reach floor" message below */
            if (can_reach_floor(1)) {
                /* cancelled wand turns to dust */
                if (de.otmp.spe < 0)
                    de.zapwand = 1;
                /* empty wand just doesn't write */
                else
                    C.pline_The("wand is too worn out to engrave.");
            }
        }
        break;

    case C.WEAPON_CLASS:
        if (C.is_art(de.otmp, C.ART_FIRE_BRAND)) {
            de.type = C.BURN; /* doesn't dull weapon */
        } else if (C.is_blade(de.otmp)) {
            /* if non-blade or welded or too dull, engraving type stays set
               to DUST; feedback for that is only given for bladed weapons */
            if (C.welded(de.otmp))
                C.pline("%s can only scratch the %s.",
                      C.Yname2(de.otmp), C.surface(C.u.ux, C.u.uy));
            else if (C.int(de.otmp.spe) <= -3)
                C.pline("%s too dull for engraving.",
                      C.Yobjnam2(de.otmp, "are"));
            else
                de.type = C.ENGRAVE;
        }
        break;

    case C.TOOL_CLASS:
        if (C.samePtr(de.otmp, C.ublindf)) {
            C.pline(
                "That is a bit difficult to engrave with, don't you think?");
            de.ret = C.ECMD_FAIL;
            return 0;
        }
        switch (de.otmp.otyp) {
        case C.MAGIC_MARKER:
            if (de.otmp.spe <= 0)
                C.Your("marker has dried out.");
            else
                de.type = C.MARK;
            break;
        case C.TOWEL:
            /* Can't really engrave with a towel */
            de.ptext = 0;
            if (de.oep) {
                if (de.oep.engr_type == C.DUST
                    || de.oep.engr_type == C.ENGR_BLOOD
                    || de.oep.engr_type == C.MARK) {
                    if (C.is_wet_towel(de.otmp))
                        C.dry_a_towel(de.otmp, -1, 1);
                    if (!C.Blind)
                        C.You("wipe out the message here.");
                    else
                        C.pline("%s %s.", C.Yobjnam2(de.otmp, "get"),
                              de.frosted ? "frosty" : "dusty");
                    de.dengr = 1;
                } else {
                    C.pline("%s can't wipe out this engraving.",
                          C.Yname2(de.otmp));
                }
            } else {
                C.pline("%s %s.", C.Yobjnam2(de.otmp, "get"),
                      de.frosted ? "frosty" : "dusty");
            }
            break;
        default:
            break;
        }
        break;

    case C.VENOM_CLASS:
        /* this used to be ``if (wizard)'' and fall through to ILLOBJ_CLASS
           for normal play, but splash of venom isn't "illegal" because it
           could occur in normal play via wizard mode bones */
        C.pline("Writing a poison pen letter?");
        break;

    case C.ILLOBJ_CLASS:
        C.impossible("You're engraving with an illegal object!");
        break;
    }

    return 1;
}

/* which verb phrasing to use for engraving */
export function doengrave_ctx_verb(de)
{
    switch (de.type) {
    default:
        de.everb = de.adding ? "add to the weird writing on"
                               : "write strangely on";
        break;
    case C.DUST:
        de.everb = de.adding ? "add to the writing in" : "write in";
        de.eloc = de.frosted ? "frost" : "dust";
        break;
    case C.HEADSTONE:
        de.everb = de.adding ? "add to the epitaph on" : "engrave on";
        break;
    case C.ENGRAVE:
        de.everb = de.adding ? "add to the engraving in" : "engrave in";
        break;
    case C.BURN:
        de.everb = de.adding ? (de.frosted ? "add to the text melted into"
                                  : "add to the text burned into")
                       : (de.frosted ? "melt into" : "burn into");
        break;
    case C.MARK:
        de.everb = de.adding ? "add to the graffiti on" : "scribble on";
        break;
    case C.ENGR_BLOOD:
        de.everb = de.adding ? "add to the scrawl on" : "scrawl on";
        break;
    }
}

/* Mohs' Hardness Scale:
 *  1 - Talc             6 - Orthoclase
 *  2 - Gypsum           7 - Quartz
 *  3 - Calcite          8 - Topaz
 *  4 - Fluorite         9 - Corundum
 *  5 - Apatite         10 - Diamond
 *
 * Since granite is an igneous rock hardness ~ 7, anything >= 8 should
 * probably be able to scratch the rock.
 * Devaluation of less hard gems is not easily possible because obj struct
 * does not contain individual oc_cost currently. 7/91
 *
 * steel      - 5-8.5   (usu. weapon)
 * diamond    - 10                      * jade       -  5-6      (nephrite)
 * ruby       -  9      (corundum)      * turquoise  -  5-6
 * sapphire   -  9      (corundum)      * opal       -  5-6
 * topaz      -  8                      * glass      - ~5.5
 * emerald    -  7.5-8  (beryl)         * dilithium  -  4-5??
 * aquamarine -  7.5-8  (beryl)         * iron       -  4-5
 * garnet     -  7.25   (var. 6.5-8)    * fluorite   -  4
 * agate      -  7      (quartz)        * brass      -  3-4
 * amethyst   -  7      (quartz)        * gold       -  2.5-3
 * jasper     -  7      (quartz)        * silver     -  2.5-3
 * onyx       -  7      (quartz)        * copper     -  2.5-3
 * moonstone  -  6      (orthoclase)    * amber      -  2-2.5
 */

/* the #engrave command */
export function doengrave()
{
    let sp;         /* Place holder for space count of engr text */
    let de;
    let retval;
    let initial_msg_given = 0;

    /* Can the adventurer engrave at all? */
    if (!u_can_engrave())
        return C.ECMD_FAIL;

    de = C.context(C.alloc(C.ContextSize));
    doengrave_ctx_init(de);

    C.gm.multi = 0;              /* moves consumed */
    C.gn.nomovemsg = 0; /* occupation end message */

    /* One may write with finger, or weapon, or wand, or..., or...
     * Edited by GAN 10/20/86 so as not to change weapon wielded.
     */

    // Original doengr_exit is the closing edge of this block.
    doengr_exit: {
    de.otmp = C.getobj("write with", stylus_ok, C.GETOBJ_PROMPT);
    if (!de.otmp) {/* otmp == &hands_obj if fingers */
        de.ret = C.ECMD_CANCEL;
        break doengr_exit;
    }

    if (C.samePtr(de.otmp, C.hands_obj)) {
        C.Strcat(C.strcpy(de.fbuf, "your "), C.body_part(C.FINGERTIP));
        de.writer = de.fbuf;
    } else {
        de.writer = C.yname(de.otmp);
    }

    /* There's no reason you should be able to write with a wand
     * while both your hands are tied up.
     */
    if (!freehand() && !C.samePtr(de.otmp, C.uwep) && !de.otmp.owornmask) {
        C.You("have no free %s to write with!", C.body_part(C.HAND));
        break doengr_exit;
    }

    if (de.jello) {
        C.You("tickle %s with %s.", C.mon_nam(C.u.ustuck), de.writer);
        C.Your("message dissolves...");
        break doengr_exit;
    }
    if (!can_reach_floor(1)) {
        if (de.otmp.oclass != C.WAND_CLASS) {
            cant_reach_floor(C.u.ux, C.u.uy, 0, 1, 0);
            break doengr_exit;
        } else {
            C.You("gesture, with your wand, towards the %s below you.",
                C.surface(C.u.ux, C.u.uy));
            initial_msg_given = 1;
        }
    }
    if (C.IS_ALTAR(C.levl[C.u.ux][C.u.uy].typ)) {
        if (!initial_msg_given)
            C.You("make a motion towards the altar with %s.", de.writer);
        C.altar_wrath(C.u.ux, C.u.uy);
        break doengr_exit;
    }
    if (C.IS_GRAVE(C.levl[C.u.ux][C.u.uy].typ)) {
        if (C.samePtr(de.otmp, C.hands_obj)) { /* using only finger */
            C.You("would only make a small smudge on the %s.",
                C.surface(C.u.ux, C.u.uy));
            break doengr_exit;
        } else if (!C.levl[C.u.ux][C.u.uy].disturbed) {
            /* disturb the grave: summon a ghoul, same as sometimes
               happens when kicking; sets levl[ux][uy]->disturbed so
               that it'll only happen once */
            disturb_grave(C.u.ux, C.u.uy);
            break doengr_exit;
        }
    }

    /* SPFX for items */
    if (!doengrave_sfx_item(de))
        break doengr_exit;

    if (C.IS_GRAVE(C.levl[C.u.ux][C.u.uy].typ)) {
        if (de.type == C.ENGRAVE || de.type == 0) {
            de.type = C.HEADSTONE;
        } else {
            /* ensures the "cannot wipe out" case */
            de.type = C.DUST;
            de.dengr = 0;
            de.teleengr = 0;
            C.storeChar(de.buf + (0), 0);
        }
    }

    /*
     * End of implement setup
     */

    /* Identify stylus */
    if (de.doknown) {
        C.learnwand(de.otmp);
        if (C.objects[de.otmp.otyp].oc_name_known)
            C.more_experienced(0, 10);
    }
    if (de.teleengr) {
        rloc_engr(de.oep);
        de.oep.eread = 0;
        de.oep.erevealed = 0;
        de.disprefresh = 1;
        de.oep = 0;
    }
    if (de.dengr) {
        del_engr(de.oep);
        de.oep = 0;
        de.disprefresh = 1;
    }
    /* Something has changed the engraving here */
    if (C.loadChar(de.buf)) {
        let tmp_ep;

        C.callLocal(make_engr_at, C.u.ux, C.u.uy, de.buf, de.ebuf, C.svm.moves, de.type);
        tmp_ep = engr_at(C.u.ux, C.u.uy);
        if (!C.Blind) {
            if (tmp_ep != 0) {
                C.pline_The("engraving now reads: \"%s\".", de.buf);
                tmp_ep.eread = 1;
                tmp_ep.erevealed = 1;
                de.disprefresh = 1;
            }
        }
        de.ptext = 0;
    }
    if (de.zapwand && (de.otmp.spe < 0)) {
        C.pline("%s %sturns to dust.", C.The(C.xname(de.otmp)),
              C.Blind ? "" : "glows violently, then ");
        if (!C.IS_GRAVE(C.levl[C.u.ux][C.u.uy].typ))
            C.You(
    "are not going to get anywhere trying to write in the %s with your dust.",
                de.frosted ? "frost" : "dust");
        C.useup(de.otmp);
        de.otmp = 0; /* wand is now gone */
        de.ptext = 0;
    }
    /* Early exit for some implements. */
    if (!de.ptext) {
        if (de.otmp && de.otmp.oclass == C.WAND_CLASS
            && !can_reach_floor(1))
            cant_reach_floor(C.u.ux, C.u.uy, 0, 1, 1);
        de.ret = C.ECMD_TIME;
        break doengr_exit;
    }
    /*
     * Special effects should have deleted the current engraving (if
     * possible) by now.
     */
    if (de.oep) {
        let c = 110;

        /* Give player the choice to add to engraving. */
        if (de.type == C.HEADSTONE) {
            /* no choice, only append */
            c = 121;
        } else if (de.type == de.oep.engr_type
                   && (!C.Blind || de.oep.engr_type == C.BURN
                       || de.oep.engr_type == C.ENGRAVE)) {
            c = C.yn_function("Do you want to add to the current engraving?",
                            C.ynqchars, 121, 1);
            if (c == 113) {
                C.pline1(C.Never_mind);
                break doengr_exit;
            }
        }

        if (c == 110 || C.Blind) {
            if (de.oep.engr_type == C.DUST
                || de.oep.engr_type == C.ENGR_BLOOD
                || de.oep.engr_type == C.MARK) {
                if (!C.Blind) {
                    C.You("wipe out the message that was %s here.",
                        (de.oep.engr_type == C.DUST)
                            ? (de.frosted
                                ? "written in the frost"
                                : "written in the dust")
                            : (de.oep.engr_type == C.ENGR_BLOOD)
                                ? "scrawled in blood"
                                : "written");
                    del_engr(de.oep);
                    de.oep = 0;
                    de.disprefresh = 1;
                } else {
                    /* defer deletion until after we *know* we're engraving */
                    de.eow = 1;
                }
            } else if (de.type == C.DUST || de.type == C.MARK
                       || de.type == C.ENGR_BLOOD) {
                C.You("cannot wipe out the message that is %s the %s here.",
                    (de.oep.engr_type == C.BURN)
                        ? (de.frosted ? "melted into" : "burned into")
                        : "engraved in",
                    C.surface(C.u.ux, C.u.uy));
                de.ret = C.ECMD_TIME;
                break doengr_exit;
            } else if (de.type != de.oep.engr_type || c == 110) {
                if (!C.Blind || can_reach_floor(1))
                    C.You("will overwrite the current message.");
                de.eow = 1;
            }
        } else if (de.oep
                   && C.Strlen(de.oep.engr_txt[C.actual_text], 2) >= C.BUFSZ - 1) {
            C.There("is no room to add anything else here.");
            de.ret = C.ECMD_TIME;
            break doengr_exit;
        }
    }

    de.eloc = C.surface(C.u.ux, C.u.uy);
    de.adding = (de.oep && !de.eow);
    doengrave_ctx_verb(de);

    /* Tell adventurer what is going on */
    if (!C.samePtr(de.otmp, C.hands_obj))
        C.You("%s the %s with %s%s.", de.everb, de.eloc,
            /* since doname() yields "N items" when quantity is more than
               one, match that by using "1 of" rather than "one of" when
               informing the player that the stack will be split */
            (de.type == C.ENGRAVE && de.otmp.quan > 1n) ? "1 of " : "",
            C.doname(de.otmp));
    else
        C.You("%s the %s with your %s.",
            de.everb, de.eloc, C.body_part(C.FINGERTIP));

    /* Prompt for engraving! */
    C.Sprintf(de.qbuf, "What do you want to %s the %s here?",
            de.everb, de.eloc);
    C.getlin(de.qbuf, de.ebuf);
    /* convert tabs to spaces and condense consecutive spaces to one */
    C.mungspaces(de.ebuf);

    /* Count the actual # of chars engraved not including spaces */
    de.len = C.strlen(de.ebuf);
    for (sp = de.ebuf; C.loadChar(sp); sp++)
        if (C.loadChar(sp) == 32)
            de.len -= 1n;

    if (de.len == 0n || C.strchr(de.ebuf, 27)) {
        if (de.zapwand) {
            if (!C.Blind)
                C.pline("%s, then %s.", C.Tobjnam(de.otmp, "glow"),
                      C.otense(de.otmp, "fade"));
            de.ret = C.ECMD_TIME;
            break doengr_exit;
        } else {
            C.pline1(C.Never_mind);
            break doengr_exit;
        }
    }

    /* A single `x' is the traditional signature of an illiterate person */
    if (de.len != 1n || (!C.strchr(de.ebuf, 120) && !C.strchr(de.ebuf, 88)))
        if (!C.u.uconduct.literate++)
            C.livelog_printf(C.LL_CONDUCT, "became literate by engraving \"%s\"",
                           de.ebuf);

    /* Mix up engraving if surface or state of mind is unsound.
       Note: this won't add or remove any spaces. */
    for (sp = de.ebuf; C.loadChar(sp); sp++) {
        if (C.loadChar(sp) == 32)
            continue;
        if (((de.type == C.DUST || de.type == C.ENGR_BLOOD) && !C.rn2(25, 1223, 'doengrave'))
            || (C.Blind && !C.rn2(11, 1224, 'doengrave')) || (C.Confusion && !C.rn2(7, 1224, 'doengrave'))
            || (C.Stunned && !C.rn2(4, 1225, 'doengrave')) || (C.Hallucination && !C.rn2(2, 1225, 'doengrave')))
            C.storeChar(sp, 32 + C.rnd(96 - 2, 1226, 'doengrave')); /* ASCII '!' thru '~'
                                        (excludes ' ' and DEL) */
    }

    /* Previous engraving is overwritten */
    if (de.eow) {
        del_engr(de.oep);
        de.oep = 0;
        de.disprefresh = 1;
    }

    C.Strcpy(C.svc.context.engraving.text, de.ebuf);
    C.svc.context.engraving.nextc = C.svc.context.engraving.text;
    C.svc.context.engraving.stylus = de.otmp;
    C.svc.context.engraving.type = de.type;
    C.svc.context.engraving.pos.x = C.u.ux;
    C.svc.context.engraving.pos.y = C.u.uy;
    C.svc.context.engraving.actionct = 0;
    C.set_occupation(engrave, "engraving", 0);

    if (C.loadChar(de.post_engr_text + (0)))
        C.pline("%s", de.post_engr_text);
    if (de.doblind && !C.resists_blnd(C.gy.youmonst)) {
        C.You("are blinded by the flash!");
        C.make_blinded(C.long(C.rnd(50, 1250, 'doengrave')), 0);
        if (!C.Blind)
            C.Your1(C.vision_clears);
    }

    /* Engraving will always take at least one action via being run as an
       occupation, so do not count this setup as taking time. */
    } // doengr_exit

    if (de.disprefresh)
        C.newsym(C.u.ux, C.u.uy);
    retval = de.ret;
    C.free(de);
    return retval;
}

/* occupation callback for engraving some text */
export function engrave()
{
    let oep;
    const buf = C.stackAlloc(C.BUFSZ); /* holds the post-this-action engr text, including
                      * anything already there */
    let finishverb; /* "You finish [foo]." */
    let stylus; /* shorthand for svc.context.engraving.stylus */
    let firsttime = (C.svc.context.engraving.actionct == 0);
    let rate = 10; /* # characters that can be engraved in this action */
    let truncate = 0;
    let neweng = (C.svc.context.engraving.actionct == 0);

    let carving = (C.svc.context.engraving.type == C.ENGRAVE
                       || C.svc.context.engraving.type == C.HEADSTONE);
    let dulling_wep, marker;
    let endc; /* points at character 1 beyond the last character to engrave
                 * this action */
    let i, space_left;

    if (C.svc.context.engraving.pos.x != C.u.ux
        || C.svc.context.engraving.pos.y != C.u.uy) { /* teleported? */
        C.You("are unable to continue engraving.");
        return 0;
    }
    /* Stylus might have been taken out of inventory and destroyed somehow.
     * Not safe to dereference stylus until after this. */
    if (C.samePtr(C.svc.context.engraving.stylus, C.hands_obj)) { /* bare finger */
        stylus = 0;
    } else {
        for (stylus = C.gi.invent; stylus; stylus = stylus.nobj) {
            if (C.samePtr(stylus, C.svc.context.engraving.stylus))
                break;
        }
        if (!stylus) {
            C.You("are unable to continue engraving.");
            return 0;
        }
    }

    dulling_wep = (carving && stylus && stylus.oclass == C.WEAPON_CLASS
                   && (stylus.otyp != C.ATHAME || stylus.cursed));
    marker = (stylus && stylus.otyp == C.MAGIC_MARKER
              && C.svc.context.engraving.type == C.MARK);

    C.svc.context.engraving.actionct++;

    /* sanity checks */
    if (dulling_wep && !C.is_blade(stylus)) {
        C.impossible("carving with non-bladed weapon");
    } else if (C.svc.context.engraving.type == C.MARK && !marker) {
        C.impossible("making graffiti with non-marker stylus");
    }

    /* Step 1: Compute rate. */
    if (carving && stylus
        && (dulling_wep || stylus.oclass == C.RING_CLASS
            || stylus.oclass == C.GEM_CLASS)) {
        /* slow engraving methods */
        rate = 1;
    } else if (marker) {
        /* one charge / 2 letters */
        rate = C.min(rate, stylus.spe * 2);
    }

    /* Step 2: Compute last character that can be engraved this action. */
    i = rate;
    for (endc = C.svc.context.engraving.nextc; C.loadChar(endc) && i > 0; endc++) {
        if (C.loadChar(endc) != 32) {
            i--;
        }
    }

    /* Step 3: affect stylus from engraving - it might wear out. */
    if (dulling_wep) {
        let splitstack = 0, dulled = 0;

        /* 'dulling_wep' guarantees that 'stylus' is a weapon which is
           not welded to the hero's hand(s) */
        if (stylus.quan > 1n) {
            if (firsttime)
                C.pline("One of %s gets dull.", C.yname(stylus));
            stylus = C.svc.context.engraving.stylus = C.splitobj(stylus, 1n);
            /* if stack is wielded or quivered, the split-off one isn't */
            stylus.owornmask = 0n;
            splitstack = 1;
        } else {
            /* normal case: stylus->quan==1 */
            if (firsttime)
                C.pline("%s gets dull.", C.Yname2(stylus));
        }
        /* Dull the weapon at a rate of -1 enchantment per 2 characters,
         * rounding down.
         * The number of characters obtainable given starting enchantment:
         * -2 => 3, -1 => 5, 0 => 7, +1 => 9, +2 => 11
         * Note: this does not allow a +0 anything (except an athame) to
         * engrave "Elbereth" all at once.
         * However, you can engrave "Elb", then "ere", then "th", by taking
         * advantage of the rounding down. */
        if (C.svc.context.engraving.actionct % 2 == 1) { /* 1st,3rd,... action */
            /* deduct a point on 1st, 3rd, 5th, ... turns, unless this is the
             * last character being engraved (a rather convoluted way to round
             * down), but always deduct a point on the 1st turn to prevent
             * zero-cost engravings.
             * Check for truncation *before* deducting a point - otherwise,
             * attempting to e.g. engrave 3 characters with a -2 weapon will
             * stop at the 1st. */
            if (stylus.spe <= -3) {
                if (firsttime) {
                    C.impossible("<= -3 weapon valid for engraving");
                }
                truncate = 1;
            } else if (C.loadChar(endc) || C.svc.context.engraving.actionct == 1) {
                stylus.spe -= 1;
                dulled = 1;
            }
        }
        if (splitstack) {
            C.obj_extract_self(stylus);
            stylus = C.hold_another_object(stylus, "You drop one %s!",
                                         C.doname(stylus), 0);
            // C.nhUse(stylus); (inactive macro)
        } else if (dulled && stylus.known) {
            /* reflect change in stylus->spe; not needed for splitstack
               since hold_another_object() does this */
            C.prinv(0, stylus, 1n);
            C.update_inventory();
        }
    } else if (marker) {
        let ink_cost = C.max(Math.trunc(rate / 2), 1); /* Prevent infinite graffiti */

        if (stylus.spe < ink_cost) {
            C.impossible("overly dry marker valid for graffiti?");
            ink_cost = stylus.spe;
            truncate = 1;
        }
        stylus.spe -= ink_cost;
        C.update_inventory();
        if (stylus.spe == 0) {
            /* can't engrave any further; truncate the string */
            C.Your("marker dries out.");
            truncate = 1;
        }
    }

    switch (C.svc.context.engraving.type) {
    default:
        finishverb = "your weird engraving";
        break;
    case C.DUST:
        finishverb = C.is_ice(C.u.ux, C.u.uy) ? "writing in the frost"
                     : "writing in the dust";
        break;
    case C.HEADSTONE:
    case C.ENGRAVE:
        finishverb = "engraving";
        break;
    case C.BURN:
        finishverb = C.is_ice(C.u.ux, C.u.uy) ? "melting your message into the ice"
                     : "burning your message into the floor";
        break;
    case C.MARK:
        finishverb = "defacing the dungeon";
        break;
    case C.ENGR_BLOOD:
        finishverb = "scrawling";
    }

    /* actions that happen at the end of every engraving action go here */

    C.storeChar(buf + (0), 0);
    oep = engr_at(C.u.ux, C.u.uy);
    if (oep) /* add to existing engraving */
        C.Strcpy(buf, oep.engr_txt[C.actual_text]);

    space_left = C.int(BigInt(C.BUFSZ) - C.strlen(buf) - 1n);
    if (C.ptrDiff(endc, C.svc.context.engraving.nextc) > space_left) {
        C.You("run out of room to write.");
        endc = C.svc.context.engraving.nextc + space_left;
        truncate = 1;
    }

    /* If the stylus did wear out mid-engraving, truncate the input so that we
     * can't go any further. */
    if (truncate && C.loadChar(endc) != 0) {
        C.storeChar(endc, 0);
        C.You("are only able to write \"%s\".", C.svc.context.engraving.text);
    } else {
        /* input was not truncated; stylus may still have worn out on the last
         * character, though */
        truncate = 0;
    }

    C.strncat(buf, C.svc.context.engraving.nextc,
                   C.min(space_left, C.ptrDiff(endc, C.svc.context.engraving.nextc)));
    C.callLocal(make_engr_at, C.u.ux, C.u.uy, buf, 0, C.long(C.svm.moves - C.gm.multi),
                 C.svc.context.engraving.type);
    oep = engr_at(C.u.ux, C.u.uy);
    if (oep) {
        oep.eread = 1;
        oep.erevealed = 1;
    }

    if (C.loadChar(endc)) {
        C.svc.context.engraving.nextc = endc;
        if (neweng) {
            C.newsym(C.svc.context.engraving.pos.x, C.svc.context.engraving.pos.y);
        }
        return 1; /* not yet finished this turn */
    } else { /* finished engraving */
        /* actions that happen after the engraving is finished go here */

        if (truncate) {
            /* Now that "You are only able to write 'foo'" also prints at the
             * end of engraving, this might be redundant. */
            C.You("cannot write any more.");
        } else if (!firsttime) {
            /* only print this if engraving took multiple actions */
            C.You("finish %s.", finishverb);
        }
        C.storeChar(C.svc.context.engraving.text + (0), 0);
        C.svc.context.engraving.nextc = 0;
        C.svc.context.engraving.stylus = 0;
    }
    if (neweng)
        C.newsym(C.svc.context.engraving.pos.x, C.svc.context.engraving.pos.y);
    return 0;
}

/* while loading bones, clean up text which might accidentally
   or maliciously disrupt player's terminal when displayed */
export function sanitize_engravings()
{
    let ep;

    for (ep = C.head_engr; ep; ep = ep.nxt_engr) {
        C.sanitize_name(ep.engr_txt[C.actual_text]);
    }
}

/* mark all engravings as not-discovered/not-read when saving bones */
export function forget_engravings()
{
    let ep;

    for (ep = C.head_engr; ep; ep = ep.nxt_engr) {
        ep.erevealed = ep.eread = 0;

        /* Note: engr_txt[actual_text], engr_txt[rememberd_text], and
         * engr_txt[pristine_text] retain their original text rather
         * than get updated to reflect each engraving's current text.
         * Does it matter? */
    }
}

export function engraving_sanity_check()
{
    let ep;
    let levtyp;

    if (C.head_engr && (C.Is_airlevel(C.u.uz) || C.Is_waterlevel(C.u.uz))) {
        C.impossible("engraving sanity: on plane of air/water");
        return;
    }

    for (ep = C.head_engr; ep; ep = ep.nxt_engr) {
        let x = ep.engr_x, y = ep.engr_y;

        if (!C.isok(x, y)) {
            C.impossible("engraving sanity: !isok <%i,%i>", x, y);
            continue;
        }
        levtyp = C.SURFACE_AT(x, y);
        if (C.is_pool_or_lava(x, y) || C.IS_AIR(levtyp) || !C.ACCESSIBLE(levtyp)) {
            C.impossible("engraving sanity: illegal surface (%d: \"%s\")",
                       levtyp, C.surface(x, y));
            continue;
        }
    }
}

export function save_engravings(nhfp)
{
    let ep, ep2;
    const no_more_engr = C.uintLocal(0), engr_alloc = C.uintLocal();
    let szeach;

    for (ep = C.head_engr; ep; ep = ep2) {
        ep2 = ep.nxt_engr;
        if (ep.engr_alloc
            && C.loadChar(ep.engr_txt[C.actual_text] + (0)) && C.update_file(nhfp)) {
            engr_alloc.value = C.uint(ep.engr_alloc);
            szeach = ep.engr_szeach;
            C.Sfo_unsigned(nhfp, engr_alloc, "engraving-engr_alloc");
            C.Sfo_engr(nhfp, ep, "engraving");
            ep.engr_txt[C.actual_text] = C.engr_text_space(ep);
            ep.engr_txt[C.remembered_text] = ep.engr_txt[C.actual_text] + szeach;
            ep.engr_txt[C.pristine_text] = ep.engr_txt[C.remembered_text] + szeach;
            C.Sfo_char(nhfp, ep.engr_txt[C.actual_text], "engraving-actual_text", szeach);
            C.Sfo_char(nhfp, ep.engr_txt[C.remembered_text], "engraving-remembered_text", szeach);
            C.Sfo_char(nhfp, ep.engr_txt[C.pristine_text], "engraving-pristine_text", szeach);
        }
        if (C.release_data(nhfp))
            C.dealloc_engr(ep);
    }
    if (C.update_file(nhfp)) {
        C.Sfo_unsigned(nhfp, no_more_engr, "engraving-engr_alloc");
    }
    if (C.release_data(nhfp))
        C.head_engr = 0;
}
/* !SFCTOOL */

export function rest_engravings(nhfp)
{
    let ep;
    const lth = C.uintLocal(0);
    let szeach;

    C.head_engr = 0;
    while (1) {
        C.Sfi_unsigned(nhfp, lth, "engraving-engr_alloc");
        if (lth.value == 0)
            return;
        ep = C.newengr(lth.value);
        C.Sfi_engr(nhfp, ep, "engraving");
        szeach = ep.engr_szeach;
        ep.nxt_engr = C.head_engr;
        C.head_engr = ep;
        ep.engr_txt[C.actual_text] = C.engr_text_space(ep); /* Andreas Bormann */
        ep.engr_txt[C.remembered_text] = ep.engr_txt[C.actual_text] + szeach;
        ep.engr_txt[C.pristine_text] = ep.engr_txt[C.remembered_text] + szeach;
        C.Sfi_char(nhfp, ep.engr_txt[C.actual_text],
                 "engraving-actual_text", C.int(szeach));
        C.Sfi_char(nhfp, ep.engr_txt[C.remembered_text],
                 "engraving-remembered_text", C.int(szeach));
        C.Sfi_char(nhfp, ep.engr_txt[C.pristine_text],
                 "engraving-pristine_text", C.int(szeach));

        while (C.loadChar(ep.engr_txt[C.actual_text] + (0)) == 32)
            ep.engr_txt[C.actual_text]++;
        while (C.loadChar(ep.engr_txt[C.remembered_text] + (0)) == 32)
            ep.engr_txt[C.remembered_text]++;
        /* mark as finished for bones levels -- no problem for
         * normal levels as the player must have finished engraving
         * to be able to move again */
        ep.engr_time = C.svm.moves;
    }
}

// #ifndef C.SFCTOOL (active game configuration)
// C.DISABLE_WARNING_FORMAT_NONLITERAL

/* to support '#stats' wizard-mode command */
export function engr_stats(hdrfmt, hdrbuf, count, size)
{
    let ep;

    C.Sprintf(hdrbuf, hdrfmt, BigInt(C.EngrSize));
    count.value = size.value = 0n;
    for (ep = C.head_engr; ep; ep = ep.nxt_engr) {
        ++count.value;
        size.value += BigInt(C.EngrSize) + BigInt(ep.engr_alloc);
    }
}

// C.RESTORE_WARNING_FORMAT_NONLITERAL

export function del_engr(ep)
{
    if (C.samePtr(ep, C.head_engr)) {
        C.head_engr = ep.nxt_engr;
    } else {
        let ept;

        for (ept = C.head_engr; ept; ept = ept.nxt_engr)
            if (C.samePtr(ept.nxt_engr, ep)) {
                ept.nxt_engr = ep.nxt_engr;
                break;
            }
        if (!ept) {
            C.impossible("Error in del_engr?");
            return;
        }
    }
    C.dealloc_engr(ep);
}

/* randomly relocate an engraving */
export function rloc_engr(ep)
{
    let tx, ty, tryct = 200;

    do {
        if (--tryct < 0)
            return;
        tx = C.rn1(C.COLNO - 3, 2, 1674, 'rloc_engr');
        ty = C.rn2(C.ROWNO, 1675, 'rloc_engr');
    } while (engr_at(tx, ty) || !C.goodpos(tx, ty, 0, 0));

    ep.engr_x = tx;
    ep.engr_y = ty;
    C.newsym(tx, ty);  /* caller took care of the old location */
}

/* Create a headstone at the given location.
 * The caller is responsible for newsym(x, y).
 */
export function make_grave(x, y, str)
{
    const buf = C.stackAlloc(C.BUFSZ);

    /* Can we put a grave here? */
    if ((C.levl[x][y].typ != C.ROOM && C.levl[x][y].typ != C.GRAVE) || C.t_at(x, y))
        return;
    /* Make the grave */
    if (!C.set_levltyp(x, y, C.GRAVE))
        return;
    /* Engrave the headstone */
    del_engr_at(x, y);
    if (!str)
        str = C.get_rnd_text(C.EPITAPHFILE, buf, C.rn2, C.MD_PAD_RUMORS);
    C.callLocal(make_engr_at, x, y, str, 0, 0n, C.HEADSTONE);
    return;
}

/* called when kicking or engraving on a grave's headstone */
export function disturb_grave(x, y)
{
    let lev = C.levl[x][y];

    if (!C.IS_GRAVE(lev.typ)) {
        C.impossible("Disturbing grave that isn't a grave? (%d)", lev.typ);
    } else if (lev.disturbed) {
        C.impossible("Disturbing already disturbed grave?");
    } else {
        C.You("disturb the undead!");
        lev.disturbed = 1;
        C.makemon(C.mons[C.PM_GHOUL], x, y, C.NO_MM_FLAGS);
        C.exercise(C.A_WIS, 0);
    }
}

export function see_engraving(ep)
{
    C.newsym(ep.engr_x, ep.engr_y);
}

/* like see_engravings() but overrides vision, but only for some types
   of engravings that can be felt  [this isn't actually used anywhere?] */
export function feel_engraving(ep)
{
    if (engr_can_be_felt(ep)) {
        ep.eread = 1;
        ep.erevealed = 1;
        C.map_engraving(ep, 1);
        /* in case it's beneath something, redisplay the something */
        C.newsym(ep.engr_x, ep.engr_y);
    }
}

export const blind_writing = [
    [0x44, 0x66, 0x6d, 0x69, 0x62, 0x65, 0x22, 0x45, 0x7b, 0x71,
     0x65, 0x6d, 0x72, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
    [0x51, 0x67, 0x60, 0x7a, 0x7f, 0x21, 0x40, 0x71, 0x6b, 0x71,
     0x6f, 0x67, 0x63, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
    [0x49, 0x6d, 0x73, 0x69, 0x62, 0x65, 0x22, 0x4c, 0x61, 0x7c,
     0x6d, 0x67, 0x24, 0x42, 0x7f, 0x69, 0x6c, 0x77, 0x67, 0x7e, 0x00],
    [0x4b, 0x6d, 0x6c, 0x66, 0x30, 0x4c, 0x6b, 0x68, 0x7c, 0x7f,
     0x6f, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
    [0x51, 0x67, 0x70, 0x7a, 0x7f, 0x6f, 0x67, 0x68, 0x64, 0x71,
     0x21, 0x4f, 0x6b, 0x6d, 0x7e, 0x72, 0x00, 0x00, 0x00, 0x00, 0x00],
    [0x4c, 0x63, 0x76, 0x61, 0x71, 0x21, 0x48, 0x6b, 0x7b, 0x75,
     0x67, 0x63, 0x24, 0x45, 0x65, 0x6b, 0x6b, 0x65, 0x00, 0x00, 0x00],
    [0x4c, 0x67, 0x68, 0x6b, 0x78, 0x68, 0x6d, 0x76, 0x7a, 0x75,
     0x21, 0x4f, 0x71, 0x7a, 0x75, 0x6f, 0x77, 0x00, 0x00, 0x00, 0x00],
    [0x44, 0x66, 0x6d, 0x7c, 0x78, 0x21, 0x50, 0x65, 0x66, 0x65,
     0x6c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
    [0x44, 0x66, 0x73, 0x69, 0x62, 0x65, 0x22, 0x56, 0x7d, 0x63,
     0x69, 0x76, 0x6b, 0x66, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
];

export function blengr()
{
    return C.blind_writing[C.rn2(C.blind_writing.length, 1767, 'blengr')];
}
/* !SFCTOOL */
/*engrave.c*/
