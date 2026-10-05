// detect.js — clairvoyance map scan.
// C ref: nethack-c/src/detect.c:1449-1585.
import { game } from './gstate.js';
import { COLNO, ROWNO, POOL, MOAT, WATER, LAVAPOOL, LAVAWALL,
         TER_DETECT, TER_MAP, TER_TRP, TER_OBJ, TER_MON, I_SPECIAL, IN_SIGHT,
         CLAIRVOYANT, CONFUSION, DETECT_MONSTERS } from './const.js';
import { pline, flush_screen, docrt, map_invisible, map_object, map_monst,
         see_monsters, canspotmon, GLYPHCLS_MON, GLYPHCLS_INVIS } from './display.js';
import { show_map_spot } from './read.js';
import { browse_map } from './cmd.js';
import { observe_object } from './o_init.js';
import { m_at } from './uhitm.js';
import { PM_LONG_WORM_TAIL } from './pm.generated.js';
import { is_moat } from './dokick.js';
import { _glyph_ident } from './cmd.js';
import { pushRngLogEntry } from './rng.js';
import { ENV } from './hostenv.js';

const _isMonGlyph = (loc) => loc?.disp_cls === GLYPHCLS_MON;
const _isInvisibleGlyph = (loc) => loc?.disp_cls === GLYPHCLS_INVIS;
/* JS has no numeric gbuf glyph; this is the full rendered identity available
 * here (the shared cmd.js _glyph_ident additionally canonicalizes cmap IDs). */
const _coversObjects = (loc, u, x, y) => {
    const typ = loc?.typ | 0;
    const pool = typ === POOL || typ === MOAT || typ === WATER || is_moat(x, y);
    return (pool && !u.uinwater) || typ === LAVAPOOL || typ === LAVAWALL;
};
const _topObject = (g, x, y) => g.level?.levelObjects?.[x]?.[y] || null;

function _unconstrainMap(u) {
    const saved = { uinwater: u.uinwater | 0, uburied: u.uburied | 0,
                    uswallow: u.uswallow | 0 };
    u.uinwater = 0; u.uburied = 0; u.uswallow = 0;
    return saved;
}

function _reconstrainMap(u, saved) {
    u.uinwater = saved.uinwater;
    u.uburied = saved.uburied;
    u.uswallow = saved.uswallow;
}

/* C detect.c:1449 do_vicinity_map().  `sobj` is the fake spellbook for a
 * cast, or null for timed clairvoyance. */
export async function do_vicinity_map(sobj) {
    const g = game, u = g.u || {};
    const clair = u.uprops?.[CLAIRVOYANT];
    const extended = !!(sobj && (sobj.blessed
        || ((clair?.intrinsic | 0) || (clair?.extrinsic | 0)) && !(clair?.blocked | 0)));
    const randomFarsight = !sobj;
    const loY = Math.max(0, (u.uy | 0) - 5), hiY = Math.min(ROWNO - 1, (u.uy | 0) + 6);
    const loX = Math.max(1, (u.ux | 0) - 9), hiX = Math.min(COLNO - 1, (u.ux | 0) + 10);
    if (typeof process !== 'undefined' && ENV?.FF_VISION_TRACE === '1')
        pushRngLogEntry(`^vision_vicinity[entry=1 moves=${g.moves | 0} incomingMove=${g.context?.move ? 1 : 0} loX=${loX} hiX=${hiX} loY=${loY} hiY=${hiY} random=${randomFarsight ? 1 : 0} active=${extended ? 1 : 0}]`);
    const savedViz = g.viz_array?.[u.uy]?.[u.ux];
    u.uprops = u.uprops || {};
    const detectProp = u.uprops[DETECT_MONSTERS]
        || (u.uprops[DETECT_MONSTERS] = { intrinsic: 0, extrinsic: 0, blocked: 0 });
    const savedDetect = detectProp?.extrinsic | 0;
    const saved = _unconstrainMap(u);
    let mdetected = false, odetected = false, refresh = false;
    if (saved.uswallow && g.viz_array?.[u.uy])
        g.viz_array[u.uy][u.ux] = (savedViz | 0) | IN_SIGHT;
    if (detectProp) detectProp.extrinsic = savedDetect | I_SPECIAL;
    try {
        for (let x = loX; x <= hiX; x++) for (let y = loY; y <= hiY; y++) {
            const loc = g.level?.at(x, y);
            if (!loc) continue;
            const oldCls = loc.disp_cls, oldIdentity = _glyph_ident(x, y);
            const confused = !!(u.uprops?.[CONFUSION]?.intrinsic | 0);
            show_map_spot(loc, x, y, confused);
            const obj = _topObject(g, x, y);
            if (obj) {
                if (extended) observe_object(obj);
                map_object(obj, true);
                if (_glyph_ident(x, y) !== oldIdentity && _coversObjects(loc, u, x, y)) odetected = true;
            }
            const mon = m_at(x, y);
            if (mon && (mon.mx | 0) === x && (mon.my | 0) === y) {
                if ((saved.uinwater || saved.uburied || saved.uswallow
                     || !g.level?.flags?.hero_memory) && !extended
                    && (x !== u.ux || y !== u.uy) && oldCls !== GLYPHCLS_MON)
                    map_invisible(x, y);
                else map_monst(mon, false);
                if (extended && _glyph_ident(x, y) !== oldIdentity && !_isInvisibleGlyph(loc)) mdetected = true;
            }
        }
        if (randomFarsight && g.flags?.quick_farsight) mdetected = odetected = false;
        const unconstrained = !!(saved.uinwater || saved.uburied || saved.uswallow);
        if (!g.level?.flags?.hero_memory || unconstrained || mdetected || odetected) {
            await flush_screen(1);
            await pline('You sense your surroundings.');
            let terrain = TER_DETECT | TER_MAP | TER_TRP | TER_OBJ;
            if (extended || _isMonGlyph(g.level?.at(u.ux, u.uy))) terrain |= TER_MON;
            await browse_map(terrain, 'anything of interest');
            refresh = true;
        }
    } finally {
        _reconstrainMap(u, saved);
        if (detectProp) detectProp.extrinsic = savedDetect;
        if (g.viz_array?.[u.uy]) g.viz_array[u.uy][u.ux] = savedViz;
    }
    for (let x = loX; x <= hiX; x++) for (let y = loY; y <= hiY; y++) {
        if (x === u.ux && y === u.uy) continue;
        const loc = g.level?.at(x, y), mon = m_at(x, y);
        const mndx = mon?.mndx ?? mon?.mnum ?? mon?.data?.pmidx;
        if (loc && _isMonGlyph(loc) && (mndx | 0) !== PM_LONG_WORM_TAIL
            && (!mon || !canspotmon(mon))) map_invisible(x, y);
    }
    see_monsters();
    if (refresh) await docrt();
}
