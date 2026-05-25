// wall_angle.js — C display.c wall_angle() → cmap index (S_stone..S_trwall).
// Used by display.js mapTerrainGlyph when levl[].seenv is set.

import {
    VWALL, HWALL, SDOOR, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    SV0, SV1, SV2, SV3, SV4, SV5, SV6, SV7,
    WM_MASK, WM_C_OUTER, WM_C_INNER,
    WM_T_LONG, WM_T_BL, WM_T_BR,
    WM_X_TL, WM_X_TR, WM_X_BL, WM_X_BR, WM_X_TLBR, WM_X_BLTR,
} from './const.js';

/** C: defsym.h PCHAR cmap indices for walls. */
const S_stone = 0;
const S_vwall = 1;
const S_hwall = 2;
const S_tlcorn = 3;
const S_trcorn = 4;
const S_blcorn = 5;
const S_brcorn = 6;
const S_crwall = 7;
const S_tuwall = 8;
const S_tdwall = 9;
const S_tlwall = 10;
const S_trwall = 11;

const T_d = 0;
const T_l = 1;
const T_u = 2;
const T_r = 3;
const T_tlcorn = 1;
const T_trcorn = 2;
const T_hwall = 3;
const T_tdwall = 4;

const wall_matrix = [
    [S_stone, S_tlcorn, S_trcorn, S_hwall, S_tdwall],
    [S_stone, S_trcorn, S_brcorn, S_vwall, S_tlwall],
    [S_stone, S_brcorn, S_blcorn, S_hwall, S_tuwall],
    [S_stone, S_blcorn, S_tlcorn, S_vwall, S_trwall],
];

const C_bl = 0;
const C_tl = 1;
const C_tr = 2;
const C_br = 3;
const C_brcorn = 1;
const C_blcorn = 2;
const C_tlwall = 3;
const C_tuwall = 4;
const C_crwall = 5;

const cross_matrix = [
    [S_brcorn, S_blcorn, S_tlcorn, S_tuwall, S_trwall, S_crwall],
    [S_blcorn, S_tlcorn, S_trcorn, S_trwall, S_tdwall, S_crwall],
    [S_tlcorn, S_trcorn, S_brcorn, S_tdwall, S_tlwall, S_crwall],
    [S_trcorn, S_brcorn, S_blcorn, S_tlwall, S_tuwall, S_crwall],
];

function only(seenv, bits) {
    return (seenv & bits) && !(seenv & ~bits);
}

function twallAngle(row, seenvIn, wmask) {
    let seenv = seenvIn;
    let col;
    switch (wmask) {
    case 0:
        if (seenv === SV4) col = T_tlcorn;
        else if (seenv === SV6) col = T_trcorn;
        else if (seenv & (SV3 | SV5 | SV7) || ((seenv & SV4) && (seenv & SV6))) col = T_tdwall;
        else if (seenv & (SV0 | SV1 | SV2)) col = (seenv & (SV4 | SV6)) ? T_tdwall : T_hwall;
        else col = 0;
        break;
    case WM_T_LONG:
        if (seenv & (SV3 | SV4) && !(seenv & (SV5 | SV6 | SV7))) col = T_tlcorn;
        else if (seenv & (SV6 | SV7) && !(seenv & (SV3 | SV4 | SV5))) col = T_trcorn;
        else if ((seenv & SV5) || ((seenv & (SV3 | SV4)) && (seenv & (SV6 | SV7)))) col = T_tdwall;
        else col = 0;
        break;
    case WM_T_BL:
        if (only(seenv, SV4 | SV5)) col = T_tlcorn;
        else if ((seenv & (SV0 | SV1 | SV2 | SV7)) && !(seenv & (SV3 | SV4 | SV5))) col = T_hwall;
        else if (only(seenv, SV6)) col = 0;
        else col = T_tdwall;
        break;
    case WM_T_BR:
        if (only(seenv, SV5 | SV6)) col = T_trcorn;
        else if ((seenv & (SV0 | SV1 | SV2 | SV3)) && !(seenv & (SV5 | SV6 | SV7))) col = T_hwall;
        else if (only(seenv, SV4)) col = 0;
        else col = T_tdwall;
        break;
    default:
        col = 0;
        break;
    }
    return row[col];
}

function crwallAngle(row, seenvIn) {
    let seenv = seenvIn;
    if (seenv === SV4) return S_stone;
    seenv &= ~SV4;
    let col;
    if (seenv === SV0) col = C_brcorn;
    else if (seenv & (SV2 | SV3)) {
        if (seenv & (SV5 | SV6 | SV7)) col = C_crwall;
        else if (seenv & (SV0 | SV1)) col = C_tuwall;
        else col = C_blcorn;
    } else if (seenv & (SV5 | SV6)) {
        if (seenv & (SV1 | SV2 | SV3)) col = C_crwall;
        else if (seenv & (SV0 | SV7)) col = C_tlwall;
        else col = 2; /* C_trcorn */
    } else if (seenv & SV1) col = seenv & SV7 ? C_crwall : C_tuwall;
    else if (seenv & SV7) col = seenv & SV1 ? C_crwall : C_tlwall;
    else col = C_crwall;
    return row[col];
}

/**
 * C: display.c wall_angle(struct rm *lev).
 * @param {{ typ: number, seenv?: number, wall_info?: number, horizontal?: boolean }} lev
 * @returns {number} cmap index (S_stone..S_trwall)
 */
export function wallAngleCmapLikeC(lev) {
    let seenv = (lev.seenv | 0) & 0xff;
    const wmask = (lev.wall_info | 0) & WM_MASK;
    const typ = lev.typ | 0;

    switch (typ) {
    case TUWALL:
        return twallAngle(wall_matrix[T_u], (seenv >> 4 | seenv << 4) & 0xff, wmask);
    case TLWALL:
        return twallAngle(wall_matrix[T_l], (seenv >> 2 | seenv << 6) & 0xff, wmask);
    case TRWALL:
        return twallAngle(wall_matrix[T_r], (seenv >> 6 | seenv << 2) & 0xff, wmask);
    case TDWALL:
        return twallAngle(wall_matrix[T_d], seenv, wmask);
    case SDOOR:
        if (lev.horizontal) {
            /* C: display.c wall_angle — `goto horiz` (HWALL branch). */
            switch (wmask) {
            case 0: return seenv ? S_hwall : S_stone;
            case 1: return seenv & (SV3 | SV4 | SV5 | SV6 | SV7) ? S_hwall : S_stone;
            case 2: return seenv & (SV0 | SV1 | SV2 | SV3 | SV7) ? S_hwall : S_stone;
            default: return S_stone;
            }
        }
        /* C: vertical SDOOR → VWALL branch (fall through). */
        /* fall through */
    case VWALL:
        switch (wmask) {
        case 0: return seenv ? S_vwall : S_stone;
        case 1: return seenv & (SV1 | SV2 | SV3 | SV4 | SV5) ? S_vwall : S_stone;
        case 2: return seenv & (SV0 | SV1 | SV5 | SV6 | SV7) ? S_vwall : S_stone;
        default: return S_stone;
        }
    case HWALL:
        switch (wmask) {
        case 0: return seenv ? S_hwall : S_stone;
        case 1: return seenv & (SV3 | SV4 | SV5 | SV6 | SV7) ? S_hwall : S_stone;
        case 2: return seenv & (SV0 | SV1 | SV2 | SV3 | SV7) ? S_hwall : S_stone;
        default: return S_stone;
        }
    case TLCORNER:
        switch (wmask) {
        case 0: return S_tlcorn;
        case WM_C_OUTER: return seenv & (SV3 | SV4 | SV5) ? S_tlcorn : S_stone;
        case WM_C_INNER: return seenv & ~SV4 ? S_tlcorn : S_stone;
        default: return S_stone;
        }
    case TRCORNER:
        switch (wmask) {
        case 0: return S_trcorn;
        case WM_C_OUTER: return seenv & (SV5 | SV6 | SV7) ? S_trcorn : S_stone;
        case WM_C_INNER: return seenv & ~SV6 ? S_trcorn : S_stone;
        default: return S_stone;
        }
    case BLCORNER:
        switch (wmask) {
        case 0: return S_blcorn;
        case WM_C_OUTER: return seenv & (SV1 | SV2 | SV3) ? S_blcorn : S_stone;
        case WM_C_INNER: return seenv & ~SV2 ? S_blcorn : S_stone;
        default: return S_stone;
        }
    case BRCORNER:
        switch (wmask) {
        case 0: return S_brcorn;
        case WM_C_OUTER: return seenv & (SV7 | SV0 | SV1) ? S_brcorn : S_stone;
        case WM_C_INNER: return seenv & ~SV0 ? S_brcorn : S_stone;
        default: return S_stone;
        }
    case CROSSWALL:
        switch (wmask) {
        case 0:
            if (seenv === SV0) return S_brcorn;
            if (seenv === SV2) return S_blcorn;
            if (seenv === SV4) return S_tlcorn;
            if (seenv === SV6) return S_trcorn;
            if (!(seenv & ~(SV0 | SV1 | SV2)) && (seenv & SV1 || seenv === (SV0 | SV2))) return S_tuwall;
            if (!(seenv & ~(SV2 | SV3 | SV4)) && (seenv & SV3 || seenv === (SV2 | SV4))) return S_trwall;
            if (!(seenv & ~(SV4 | SV5 | SV6)) && (seenv & SV5 || seenv === (SV4 | SV6))) return S_tdwall;
            if (!(seenv & ~(SV0 | SV6 | SV7)) && (seenv & SV7 || seenv === (SV0 | SV6))) return S_tlwall;
            return S_crwall;
        case WM_X_TL:
            return crwallAngle(cross_matrix[C_tl], (seenv >> 4 | seenv << 4) & 0xff);
        case WM_X_TR:
            return crwallAngle(cross_matrix[C_tr], (seenv >> 6 | seenv << 2) & 0xff);
        case WM_X_BL:
            return crwallAngle(cross_matrix[C_bl], (seenv >> 2 | seenv << 6) & 0xff);
        case WM_X_BR:
            return crwallAngle(cross_matrix[C_br], seenv);
        case WM_X_TLBR:
            if (only(seenv, SV1 | SV2 | SV3)) return S_blcorn;
            if (only(seenv, SV5 | SV6 | SV7)) return S_trcorn;
            if (only(seenv, SV0 | SV4)) return S_stone;
            return S_crwall;
        case WM_X_BLTR:
            if (only(seenv, SV0 | SV1 | SV7)) return S_brcorn;
            if (only(seenv, SV3 | SV4 | SV5)) return S_tlcorn;
            if (only(seenv, SV2 | SV6)) return S_stone;
            return S_crwall;
        default:
            return S_crwall;
        }
    default:
        return S_stone;
    }
}
