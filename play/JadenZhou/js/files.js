// files.js — file names and file access.
// C ref: files.c
//
// Ported so far: set_bonesfile_name(), open_bonesfile(). Files live in the
// contest's virtual filesystem (storage.js) instead of the playground
// directory; fqname() prefixes are not modelled.

import { game } from './gstate.js';
import { In_quest } from './const.js';
import { Is_special } from './dungeon.js';
import { vfsReadFile } from './storage.js';

// C ref: files.c set_bonesfile_name()
/* set up "file" to be file name for retrieving bones, and return a
 * bonesid to be read/written in the bones file.
 */
export function set_bonesfile_name(lev) {
    const g = game;
    let sptr;
    let file;
    let dptr;

    /*
     * "bonD0.nn"   = bones for level nn in the main dungeon;
     * "bonM0.T"    = bones for Minetown;
     * "bonQBar.n"  = bones for level n in the Barbarian quest;
     * "bon3D0.nn"  = \
     * "bon3M0.T"   =  > same as above, but for bones pool #3.
     * "bon3QBar.n" = /
     *
     * Return value for content validation skips "bon" and the
     * pool number (if present), making it feasible for the admin
     * to manually move a bones file from one pool to another by
     * renaming it.
     */
    file = "bon";
    /* SYSCF: sysopt.bones_pools is 0 (sys.c default; the recorder's
       sysconf leaves BONES_POOLS commented out), so no pool number */
    /* when this naming scheme was adopted, 'filecode' was one letter;
       3.3.0 turned it into a three letter string for quest levels */
    /* boneid is a one-character string (dungeon.js) */
    dptr = `${g.dungeons[lev.dnum].boneid}${In_quest(lev) ? g.urole.filecode : "0"}`;
    if ((sptr = Is_special(lev)) !== null)
        dptr += `.${sptr.boneid}`;
    else
        dptr += `.${lev.dlevel}`;
    g.bones = file + dptr;
    return dptr;
}

// C ref: files.c open_bonesfile()
export function open_bonesfile(lev) {
    const g = game;

    g.bonesid = set_bonesfile_name(lev);
    const fq_bones = g.bones; /* fqname(gb.bones, BONESPREFIX, 0) */
    /* nh_uncompress(fq_bones); -- no compression in the VFS */

    const data = vfsReadFile(fq_bones);
    if (data === null)
        return null;
    return { ftype: 'bones', mode: 'reading', name: fq_bones, data };
}
