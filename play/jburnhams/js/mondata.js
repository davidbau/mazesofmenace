// C ref: mondata.c
import { mons } from './monst.js';
import * as C from './const.js';

export function monsndx(ptr) {
    return mons.indexOf(ptr);
}

export function is_flyer(ptr) {
    return (ptr.mflags1 & C.M1_FLY) !== 0;
}

export function is_floater(ptr) {
    return ptr.mlet === C.S_EYE || ptr.mlet === C.S_LIGHT;
}

export function is_swimmer(ptr) {
    return (ptr.mflags1 & C.M1_SWIM) !== 0;
}

export function amphibious(ptr) {
    return (ptr.mflags1 & C.M1_AMPHIBIOUS) !== 0;
}

export function passes_walls(ptr) {
    return (ptr.mflags1 & C.M1_WALLWALK) !== 0;
}

export function amorphous(ptr) {
    return (ptr.mflags1 & C.M1_AMORPHOUS) !== 0;
}

export function tunnels(ptr) {
    return (ptr.mflags1 & C.M1_TUNNEL) !== 0;
}

export function needspick(ptr) {
    return (ptr.mflags1 & C.M1_NEEDPICK) !== 0;
}

export function hides_under(ptr) {
    return (ptr.mflags1 & C.M1_CONCEAL) !== 0;
}

export function is_undead(ptr) {
    return (ptr.mflags2 & C.M2_UNDEAD) !== 0;
}

export function is_were(ptr) {
    return (ptr.mflags2 & C.M2_WERE) !== 0;
}

export function is_elf(ptr) {
    return (ptr.mflags2 & C.M2_ELF) !== 0;
}

export function is_dwarf(ptr) {
    return (ptr.mflags2 & C.M2_DWARF) !== 0;
}

export function is_gnome(ptr) {
    return (ptr.mflags2 & C.M2_GNOME) !== 0;
}

export function is_orc(ptr) {
    return (ptr.mflags2 & C.M2_ORC) !== 0;
}

export function is_demon(ptr) {
    return (ptr.mflags2 & C.M2_DEMON) !== 0;
}

export function is_mercenary(ptr) {
    return (ptr.mflags2 & C.M2_MERC) !== 0;
}

export function type_is_pname(ptr) {
    return (ptr.mflags2 & C.M2_PNAME) !== 0;
}

export function is_animal(ptr) {
    return (ptr.mflags1 & C.M1_ANIMAL) !== 0;
}

export function nohands(ptr) {
    return (ptr.mflags1 & C.M1_NOHANDS) !== 0;
}

import { game } from './gstate.js';

export function montooweak(monindx, lev) {
    return mons[monindx].difficulty < lev;
}

export function montoostrong(monindx, lev) {
    return mons[monindx].difficulty > lev;
}

export function monmin_difficulty(levdif) {
    return Math.floor(levdif / 6);
}

export function monmax_difficulty(levdif) {
    return Math.floor((levdif + game.u.ulevel) / 2);
}

export function is_home_elemental(ptr) {
    if (ptr.mlet === C.S_ELEMENTAL) {
        const mndx = monsndx(ptr);
        switch (mndx) {
            case C.PM_AIR_ELEMENTAL:
                return C.Is_airlevel();
            case C.PM_FIRE_ELEMENTAL:
                return C.Is_firelevel();
            case C.PM_EARTH_ELEMENTAL:
                return C.Is_earthlevel();
            case C.PM_WATER_ELEMENTAL:
                return C.Is_waterlevel();
            default:
                break;
        }
    }
    return false;
}

export function wrong_elem_type(ptr) {
    if (ptr.mlet === C.S_ELEMENTAL) {
        return !is_home_elemental(ptr);
    } else if (C.Is_earthlevel()) {
        /* no restrictions? */
    } else if (C.Is_waterlevel()) {
        /* just monsters that can swim */
        if (!is_swimmer(ptr))
            return true;
    } else if (C.Is_firelevel()) {
        if (!pm_resistance(ptr, C.MR_FIRE))
            return true;
    } else if (C.Is_airlevel()) {
        if (!(is_flyer(ptr) && ptr.mlet !== C.S_TRAPPER) && !is_floater(ptr)
            && !amorphous(ptr) && !noncorporeal(ptr) && !is_whirly(ptr))
            return true;
    }
    return false;
}

export function pm_resistance(ptr, typ) {
    return (ptr.mresists & typ) !== 0;
}

export function noncorporeal(ptr) {
    return ptr.mlet === C.S_GHOST;
}

export function is_whirly(ptr) {
    return ptr.mlet === C.S_VORTEX || ptr === mons[C.PM_AIR_ELEMENTAL];
}
