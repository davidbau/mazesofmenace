// insight.js — C ref: insight.c.
import { ceiling, surface, waterbody_name, youhiding_enlightenment } from './cmd.js';
import { FLYING, TT_PIT, SPIKED_PIT } from './const.js';
import { game } from './gstate.js';
import { is_pool } from './look.js';
import { ansimpleoname, simple_typename } from './objnam.js';
import { pline } from './pline.js';
import { M1_CLING, M1_FLY, M_AP_FURNITURE_local, M_AP_NOTHING_local, M_AP_OBJECT_local, S_EEL, _hides_under, an } from './polyself.js';

const M_AP_MONSTER_local = 3;        /* monst.h:55 */

// ── C insight.c:2027 youhiding(via_enlghtmt, msgflag) — the dohide() topline. ──
// C ref: nethack-c/src/insight.c:2027-2082.  RNG-free.
//
//   Strcpy(buf, "hiding");
//   if (U_AP_TYPE != M_AP_NOTHING) {          /* mimic */
//       bp = eos(strcpy(buf, "mimicking"));
//       if (U_AP_TYPE == M_AP_OBJECT)    Sprintf(bp, " %s",
//                          an(simple_typename(gy.youmonst.mappearance)));
//       else if (U_AP_TYPE == M_AP_FURNITURE) Strcpy(bp, " something");
//       else if (U_AP_TYPE == M_AP_MONSTER)   Strcpy(bp, " someone");
//   if (via_enlghtmt) you_are(buf, "");
//   else You("are %s %s.", msgflag ? "already" : "now", buf);
//
// mappearance == STRANGE_OBJECT: "You are now mimicking a strange object."
export function youhiding_buf() {
    const g = game;
    const u = g.u;
    let buf = 'hiding';
    const apType = (g.youmonst?.m_ap_type | 0) & 7;
    if (apType !== M_AP_NOTHING_local) {
        buf = 'mimicking';
        if (apType === M_AP_OBJECT_local)
            buf += ' ' + an(simple_typename(g.youmonst.mappearance | 0));
        else if (apType === M_AP_FURNITURE_local)
            buf += ' something';
        else if (apType === M_AP_MONSTER_local)
            buf += ' someone';
        /* else: something unexpected — C leaves 'buf' as "mimicking" */
    } else if (u.uundetected) {
        const data = g.youmonst?.data;
        if (data && (data.mlet | 0) === S_EEL) {
            if (is_pool(u.ux, u.uy))
                buf += ' in the ' + waterbody_name(u.ux, u.uy);
        } else if (data && _hides_under(data)) {
            const otmp = g.level?.levelObjects?.[u.ux]?.[u.uy] ?? null;
            if (otmp)
                buf += ' underneath ' + ansimpleoname(otmp);
        } else if ((data && ((data.mflags1 | 0) & M1_CLING) !== 0)
                            || (((u.uprops?.[FLYING]?.intrinsic | 0)
                                 || (u.uprops?.[FLYING]?.extrinsic | 0)
                                 || (u.usteed?.data?.mflags1 & M1_FLY))
                                && !(u.uprops?.[FLYING]?.blocked | 0))) {
            /* Flying forms hide on the ceiling even when they do not cling. */
            buf += ' on the ' + ceiling(u.ux, u.uy);
        } else if (u.utrap && (u.utraptype | 0) === TT_PIT) {
            const traps = g.level?.traps;
            const trap = Array.isArray(traps)
                ? traps.find(t => (t.tx | 0) === (u.ux | 0)
                              && (t.ty | 0) === (u.uy | 0)) : null;
            buf += ' in a ' + (trap && (trap.ttyp | 0) === SPIKED_PIT
                ? 'spiked ' : '') + 'pit';
        } else {
            buf += ' on the ' + surface(u.ux, u.uy);
        }
    }
    return buf;
}

export function youhiding(via_enlghtmt, msgflag) {
    const buf = youhiding_buf();
    if (via_enlghtmt) {
        youhiding_enlightenment(buf, msgflag);
        return;
    }
    /* C insight.c:2075: finish the blocking message before dohide returns. */
    return pline(`You are ${msgflag ? 'already' : 'now'} ${buf}.`);
}
