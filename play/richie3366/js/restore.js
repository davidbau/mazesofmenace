// restore.js — JSON analogue of restore.c monster restore.
// C ref: nethack-c/upstream/src/restore.c restmon `:307–373` (+ helpers
//   makemon.c newmextra/init_mextra `:1056–1072`, do_name.c new_mgivenname
//   `:31–47`, bones.c newebones `:818–830`, restore.c moves_to_relative_time
//   / relative_time_to_moves `:1319–1333`).
// Wire format: C reads binary NHFILE via Sfi_monst / Sfi_int / Sfi_char /
//   Sfi_egd / Sfi_epri / Sfi_eshk / Sfi_emin / Sfi_edog / Sfi_ebones; the JS
//   save codec (lev_json.js) stores monsters as JSON blobs, so each Sfi_*
//   below is a field-presence gate + blob copy in the same C order, not a
//   file read (Rule #2; cf. lev_json.js dst-absolute precedent). Base monst
//   fields arrive on `mtmp` already (Sfi_monst analogue); this module only
//   rebuilds `nmon` + `mextra` per C.

import { game } from './gstate.js';
import {
    NON_PM,
    EGD,
    EPRI,
    ESHK,
    EMIN,
    EDOG,
    EBONES,
} from './const.js';
import {
    newegd,
    newepri,
    neweshk,
    newemin,
    newedog,
} from './makemon.js';

/**
 * C ref: makemon.c init_mextra `:1059–1063` + newmextra `:1064–1072`.
 * C allocs sizeof (struct mextra) then init_mextra copies zeromextra
 * (all extension pointers NULL) and sets mcorpsenm = NON_PM.
 * JS absent keys are NULL; mcorpsenm is explicit so MCORPSENM reads NON_PM.
 */
export function newmextra() {
    // C `:1061–1062` *mex = zeromextra; mex->mcorpsenm = NON_PM
    return { mcorpsenm: NON_PM };
}

/**
 * C ref: do_name.c new_mgivenname `:31–47` (+ free_mgivenname `:50–57`
 * inlined as the two deletes below).
 * C: lth nonzero → ensure mextra (else drop old name), alloc lth bytes
 * (caller adds 1 for NUL; Sfi_char fills next); lth zero → drop old name.
 * JS placeholder is '' — restmon overwrites with the blob string next,
 * mirroring Sfi_char `:324`.
 */
export function new_mgivenname(mon, lth) {
    if (!mon) return;
    if (lth) {
        // C `:36–40` ensure mextra / free old name
        if (!mon.mextra) {
            mon.mextra = newmextra();
        } else {
            // C free_mgivenname `:52–56` inlined
            if (mon.mextra.mgivenname != null) delete mon.mextra.mgivenname;
            if (mon.mgivenname != null) delete mon.mgivenname;
        }
        // C `:41` MGIVENNAME(mon) = alloc(lth) — reserve; caller copies
        mon.mextra.mgivenname = '';
    } else {
        // C `:43–46` zero length: drop old name, keep mextra
        if (mon.mextra && mon.mextra.mgivenname != null) {
            delete mon.mextra.mgivenname;
        }
        if (mon.mgivenname != null) delete mon.mgivenname;
    }
}

/**
 * C ref: bones.c newebones `:818–830` (template in mextra.h `:52–64`).
 * C: ensure mextra, alloc sizeof (struct ebones), memset 0,
 * parentmid = m_id. JS zeros match the memset; parentmid tags the owner.
 */
export function newebones(mtmp) {
    if (!mtmp) return undefined;
    // C `:821–822` if (!mtmp->mextra) mtmp->mextra = newmextra()
    if (!mtmp.mextra) mtmp.mextra = newmextra();
    // C `:823–829` if (!EBONES(mtmp)) alloc + memset 0 + parentmid
    if (!EBONES(mtmp)) {
        mtmp.mextra.ebones = {
            parentmid: mtmp.m_id | 0,
            role: 0,
            race: 0,
            oldalign: 0,
            deathlevel: 0,
            luck: 0,
            mnum: 0,
            female: 0,
            demigod: 0,
            crowned: 0,
        };
    }
    return EBONES(mtmp);
}

/**
 * C ref: restore.c moves_to_relative_time (save.c `:868–869` write path).
 * C: *timestamp = prevts - svm.moves. Pointer analogue: holder[key].
 */
export function moves_to_relative_time(holder, key) {
    if (!holder) return;
    const prevts = holder[key] | 0;
    holder[key] = (prevts - (game.moves | 0)) | 0;
}

/**
 * C ref: restore.c relative_time_to_moves `:1328–1333`.
 * C: *timestamp = svm.moves + prevts. Pointer analogue: holder[key].
 * restmon calls this on EDOG droptime/hungrytime when the wire holds
 * relative times; the JSON codec stores absolute times (game.moves is
 * restored before monsters, save side never relativizes — cf. makemon.js
 * savemon_edog), so restmon below documents the skip and keeps absolute.
 */
export function relative_time_to_moves(holder, key) {
    if (!holder) return;
    const prevts = holder[key] | 0;
    holder[key] = ((game.moves | 0) + prevts) | 0;
}

/**
 * C ref: restore.c restmon `:307–373` (staticfn).
 * C signature restmon(NHFILE *nhfp, struct monst *mtmp); JS takes the
 * already-parsed monster blob — base fields are the Sfi_monst `:311`
 * analogue and each Sfi_int length gate below is a blob-presence check.
 * Rebuilds nmon + mextra in C order; returns the same object.
 * C callers: restobj `:209–210` (OMONST corpse/statue) and restmonchn
 * `:393` (monster chain) — JS callers: lev_json.js deserMon (chain) and
 * deserObjChain (oextra.omonst).
 */
export function restmon(mtmp) {
    if (!mtmp) return mtmp;
    // C `:311` Sfi_monst(nhfp, mtmp, "monst") — base already on mtmp (JSON).
    // C `:313–314` next monster pointer is invalid
    mtmp.nmon = null;
    // C `:316` non-null mextra needs reconstruction; null stays null and
    // no length words are read
    if (!mtmp.mextra) return mtmp;
    const saved = mtmp.mextra;
    // C `:317` fresh zeroed mextra (mcorpsenm NON_PM via newmextra)
    mtmp.mextra = newmextra();

    // C `:320–325` mgivenname: Sfi_int buflen ("monst-mgivenname_length",
    // NUL-inclusive); buflen > 0 → new_mgivenname + Sfi_char copy
    if (typeof saved.mgivenname === 'string') {
        new_mgivenname(mtmp, saved.mgivenname.length + 1);
        // C `:323` Sfi_char into MGIVENNAME — blob copy
        mtmp.mextra.mgivenname = saved.mgivenname;
    }

    // C `:327–331` egd: Sfi_int buflen; buflen > 0 → newegd + Sfi_egd
    if (saved.egd != null && typeof saved.egd === 'object') {
        const dst = newegd(mtmp);
        Object.assign(dst, saved.egd);
    }
    // C `:333–337` epri: Sfi_int buflen; buflen > 0 → newepri + Sfi_epri
    if (saved.epri != null && typeof saved.epri === 'object') {
        const dst = newepri(mtmp);
        Object.assign(dst, saved.epri);
    }
    // C `:339–343` eshk: Sfi_int buflen; buflen > 0 → neweshk + Sfi_eshk
    if (saved.eshk != null && typeof saved.eshk === 'object') {
        const dst = neweshk(mtmp);
        Object.assign(dst, saved.eshk);
    }
    // C `:345–349` emin: Sfi_int buflen; buflen > 0 → newemin + Sfi_emin
    if (saved.emin != null && typeof saved.emin === 'object') {
        const dst = newemin(mtmp);
        Object.assign(dst, saved.emin);
    }
    // C `:351–361` edog: Sfi_int buflen; buflen > 0 → newedog + Sfi_edog,
    // then relative_time_to_moves pair + apport sanity
    if (saved.edog != null && typeof saved.edog === 'object') {
        const dst = newedog(mtmp);
        Object.assign(dst, saved.edog);
        if (dst.ogoal != null && typeof dst.ogoal === 'object') {
            dst.ogoal = { x: dst.ogoal.x | 0, y: dst.ogoal.y | 0 };
        }
        // C `:355–356` relative_time_to_moves pair — SKIPPED: JSON wire
        // holds absolute droptime/hungrytime (save side never relativized;
        // game.moves restores before monsters), so no add-back. Named
        // wire-format difference (cf. lev_json dst-absolute precedent).
        // C `:358–360` sanity check to prevent rn2(0)
        if ((dst.apport | 0) <= 0) {
            dst.apport = 1;
        }
        // makemon.js newedog mirror so dog readers see C EDOG
        mtmp.edog = dst;
    } else if (mtmp.edog != null) {
        delete mtmp.edog;
    }
    // C `:363–367` ebones: Sfi_int buflen; buflen > 0 → newebones + Sfi_ebones
    if (saved.ebones != null && typeof saved.ebones === 'object') {
        const dst = newebones(mtmp);
        Object.assign(dst, saved.ebones);
    }
    // C `:369–371` mcorpsenm inline int (no length gate; always read when
    // mextra present): Sfi_int mc then MCORPSENM = mc
    if (typeof saved.mcorpsenm === 'number') {
        mtmp.mextra.mcorpsenm = saved.mcorpsenm | 0;
    }
    // else: keep NON_PM from newmextra (C file always carries the word;
    // absent key = pre-port JSON without the chunk)
    return mtmp;
}
