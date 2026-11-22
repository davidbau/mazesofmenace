// bones.js — bones files.
// C ref: bones.c
//
// Ported so far: no_bones_level(), getbones() up to opening the bones file.
// Saving bones (savebones()) and loading them (the restore half of
// getbones()) are not ported yet.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { Is_botlevel } from './const.js';
import {
    ledger_no, assign_level, Is_special, Is_branchlev, In_hell,
    dunlevs_in_dungeon,
} from './dungeon.js';
import { open_bonesfile } from './files.js';

// C ref: bones.c sanitize_name()
/* while loading bones, strip out text possibly supplied by old player
   that might accidentally or maliciously disrupt new player's display
   (C modifies 'namebuf' in place; JS returns the sanitized copy) */
export function sanitize_name(namebuf) {
    /* WINDOWPORT(tty) && !iflags.wc_eight_bit_input */
    const strip_8th_bit = !game.iflags?.wc_eight_bit_input;
    let out = '';

    /* it's tempting to skip this for single-user platforms, since
       only the current player could have left these bones--except
       things like "hearse" and other bones exchange schemes make
       that assumption false */
    for (const ch of namebuf) {
        const code = ch.charCodeAt(0);
        const c = code & 0o177;
        if (c < 0x20 || c === 0o177) {
            /* non-printable or undesirable */
            out += '.';
        } else if (c !== code) {
            /* expected to be printable if user wants such things */
            out += strip_8th_bit ? '_' : ch;
        } else {
            out += ch;
        }
    }
    return out;
}

// C ref: bones.c no_bones_level()
function no_bones_level(lev) {
    const g = game;
    let sptr;
    const save_dlevel = g.save_dlevel || { dnum: 0, dlevel: 0 };

    if (ledger_no(save_dlevel))
        assign_level(lev, save_dlevel);

    return (((sptr = Is_special(lev)) !== null && !sptr.boneid)
            || !g.dungeons[lev.dnum].boneid
            /* no bones on the last or multiway branch levels
               in any dungeon (level 1 isn't multiway) */
            || Is_botlevel(lev)
            || (Is_branchlev(lev) && lev.dlevel > 1)
            /* no bones in the invocation level */
            || (In_hell(lev)
                && lev.dlevel === dunlevs_in_dungeon(lev) - 1)) ? true : false;
}

// C ref: bones.c getbones()
export function getbones() {
    const g = game;
    const flags = g.flags;
    const wizard = !!flags.debug, discover = !!flags.explore;

    if (discover) /* save bones files for real games */
        return 0;

    if (!flags.bones)
        return 0;
    /* wizard check added by GAN 02/05/87 */
    if (rn2(3) /* only once in three times do we find bones */
        && !wizard)
        return 0;
    if (no_bones_level(g.u.uz))
        return 0;

    const nhfp = open_bonesfile(g.u.uz);
    if (!nhfp)
        return 0;

    /* validate() and the restore of the bones level: not ported yet */
    throw new Error('getbones(): loading a bones file is not ported yet');
}
