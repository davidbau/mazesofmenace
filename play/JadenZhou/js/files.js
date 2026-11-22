// files.js — file names and file access.
// C ref: files.c
//
// Ported so far: the bones file functions (set_bonesfile_name(),
// set_bonestemp_name(), create/commit/open/delete/compress_bonesfile()),
// the level and save file functions below. Files live in the
// contest's virtual filesystem (storage.js) instead of the playground
// directory; fqname() prefixes are not modelled.

import { game } from './gstate.js';
import { In_quest, LFILE_EXISTS, NHF_LEVELFILE, NHF_SAVEFILE, NHF_BONESFILE,
         READING, WRITING, FREEING } from './const.js';
import { Is_special } from './dungeon.js';
import { vfsReadFile, vfsWriteFile, vfsDeleteFile } from './storage.js';
import { new_nhfile, close_nhfile, nhfile_contents, nhfile_from_contents,
         Sfo, Sfi } from './sfbase.js';

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

// C ref: files.c set_bonestemp_name()
/* set up temporary file name for writing bones, to avoid another game's
 * trying to read from an uncompleted bones file.  we want an uncontentious
 * name, so use one in the namespace reserved for this game's level files.
 * (we are not reading or writing level files while writing bones files, so
 * the same array may be used instead of copying.)
 */
function set_bonestemp_name() {
    const g = game;
    const lock = g.lock || '';
    const dot = lock.lastIndexOf('.');
    g.lock = `${dot >= 0 ? lock.slice(0, dot) : lock}.bn`;
    return g.lock;
}

// C ref: files.c create_bonesfile()
/* 'errbuf', when given, is a { v } holder for the failure explanation;
   the bonesid comes back in game.bonesid (C's *bonesid) */
export function create_bonesfile(lev, errbuf) {
    const g = game;
    let failed = false;

    if (errbuf)
        errbuf.v = '';
    g.bonesid = set_bonesfile_name(lev);
    const file = set_bonestemp_name(); /* fqname(file, BONESPREFIX, 0) */

    const nhfp = new_nhfile();
    nhfp.ftype = NHF_BONESFILE;
    nhfp.mode = WRITING;
    nhfp.structlevel = true;
    nhfp.fieldlevel = false;
    nhfp.addinfo = true;
    nhfp.name = file;
    nhfp.fd = -1;
    /* nhfp->fd = creat(file, FCMASK): an empty file in the storage */
    if (vfsWriteFile(file, ''))
        nhfp.fd = 1;
    else
        failed = true;
    if (failed && errbuf) /* failure explanation */
        errbuf.v = `Cannot create bones "${g.lock}", id ${g.bonesid} (errno 2).`;
    nhfp.onclose = (f) => {
        if (!vfsWriteFile(f.name, nhfile_contents(f)))
            throw new Error('create_bonesfile(): no storage for the bones file not ported yet');
    };
    /* viable_nhfile(nhfp) */
    return (nhfp.fd < 0) ? null : nhfp;
}

// C ref: files.c commit_bonesfile()
/* move completed bones file to proper name */
export function commit_bonesfile(lev) {
    const g = game;

    set_bonesfile_name(lev);
    const fq_bones = g.bones; /* fqname(gb.bones, BONESPREFIX, 0) */
    const tempname = set_bonestemp_name();

    /* ret = rename(tempname, fq_bones) */
    const data = vfsReadFile(tempname);
    let ret = -1;
    if (data !== null && vfsWriteFile(fq_bones, data)) {
        vfsDeleteFile(tempname);
        ret = 0;
    }
    if (g.flags.debug && ret !== 0)
        throw new Error(`commit_bonesfile(): "couldn't rename ${tempname} to ${fq_bones}." not ported yet`);
}

// C ref: files.c open_bonesfile()
/* the bonesid comes back in game.bonesid (C's *bonesid) */
export function open_bonesfile(lev) {
    const g = game;

    g.bonesid = set_bonesfile_name(lev);
    const fq_bones = g.bones; /* fqname(gb.bones, BONESPREFIX, 0) */
    /* nh_uncompress(fq_bones); -- no compression in the storage */

    const data = vfsReadFile(fq_bones);
    if (data === null)
        return null; /* viable_nhfile(): open() failed */
    const nhfp = new_nhfile();
    nhfp.structlevel = true;
    nhfp.fieldlevel = false;
    nhfp.ftype = NHF_BONESFILE;
    nhfp.mode = READING;
    nhfp.addinfo = true;
    nhfp.name = fq_bones;
    nhfp.fd = 1;
    nhfile_from_contents(nhfp, data);
    return nhfp;
}

// C ref: files.c delete_bonesfile()
export function delete_bonesfile(lev) {
    set_bonesfile_name(lev);
    /* reslt = unlink(fqname(gb.bones, BONESPREFIX, 0)) */
    return vfsDeleteFile(game.bones) ? 1 : 0;
}

// C ref: files.c compress_bonesfile()
/* assume we're compressing the recently read or created bonesfile, so the
 * file name is already set properly */
export function compress_bonesfile() {
    /* nh_sfconvert(), nh_compress(): no conversion or compression in the
       storage */
}

// ---------------------------------------------------------------------
// level files and the save file
//
// Level files ("<lock>.<n>") hold levels the hero isn't on; C keeps them
// in the playground until the game ends or is saved, so here they live
// for the run of the program (game.levelfiles).  The save file goes into
// the contest's cross-segment storage (storage.js), where the next
// segment's startup looks for it, as unixmain.c does on disk.

/* getuid(): the JS port has no user id; any fixed value works since the
   saving and the restoring program agree on it */
export const HACK_UID = 0;

// C ref: unixunix.c regularize()
export function regularize(s) {
    return s.replace(/[./ ]/g, '_');
}

// C ref: unixunix.c getlock() -- the name part: gl.locknum is 0 (no
// MAXPLAYERS limit), so the lock is <uid><charname>; the lock file
// itself ("<lock>.0") and the "game in progress" check aren't modelled
export function getlock() {
    const g = game;
    g.lock = regularize(`${HACK_UID}${g.plname}`);
    g.lock = set_levelfile_name(g.lock, 0);
}

// C ref: files.c set_levelfile_name()
export function set_levelfile_name(file, lev) {
    const dot = file.lastIndexOf('.');
    return `${dot >= 0 ? file.slice(0, dot) : file}.${lev}`;
}

/* svl.level_info[lev] (dungeon.h struct linfo) */
export function level_info(lev) {
    const g = game;
    if (!g.level_info)
        g.level_info = [];
    if (!g.level_info[lev])
        g.level_info[lev] = { flags: 0 };
    return g.level_info[lev];
}

function levelfiles() {
    if (!game.levelfiles)
        game.levelfiles = new Map();
    return game.levelfiles;
}

// C ref: files.c create_levelfile()
export function create_levelfile(lev, errbuf) {
    const g = game;
    if (errbuf) errbuf.v = '';
    g.lock = set_levelfile_name(g.lock || '1lock', lev);
    const fq_lock = g.lock; /* fqname(gl.lock, LEVELPREFIX, 0) */

    const nhfp = new_nhfile();
    nhfp.ftype = NHF_LEVELFILE;
    nhfp.mode = WRITING;
    nhfp.structlevel = true; /* do set this TRUE for levelfiles */
    nhfp.fieldlevel = false; /* don't set this TRUE for levelfiles */
    nhfp.name = fq_lock;
    nhfp.fd = 1;
    nhfp.onclose = (f) => { levelfiles().set(f.name, f.recs); };
    level_info(lev).flags |= LFILE_EXISTS;
    return nhfp;
}

// C ref: files.c open_levelfile()
export function open_levelfile(lev, errbuf) {
    const g = game;
    if (errbuf) errbuf.v = '';
    g.lock = set_levelfile_name(g.lock || '1lock', lev);
    const fq_lock = g.lock;
    const recs = levelfiles().get(fq_lock);
    if (!recs) {
        /* for failure, return an explanation that our caller can use */
        if (errbuf)
            errbuf.v = `Cannot open file "${g.lock}" for level ${lev} (errno 2).`;
        return null;
    }
    const nhfp = new_nhfile();
    nhfp.mode = READING;
    nhfp.structlevel = true;
    nhfp.fieldlevel = false;
    nhfp.ftype = NHF_LEVELFILE;
    nhfp.name = fq_lock;
    nhfp.fd = 1;
    nhfp.recs = recs;
    return nhfp;
}

// C ref: files.c delete_levelfile()
export function delete_levelfile(lev) {
    const g = game;
    /*
     * Level 0 might be created by port specific code that doesn't
     * call create_levfile(), so always assume that it exists.
     */
    if (lev === 0 || (level_info(lev).flags & LFILE_EXISTS)) {
        g.lock = set_levelfile_name(g.lock || '1lock', lev);
        levelfiles().delete(g.lock); /* unlink(fqname(gl.lock, LEVELPREFIX, 0)) */
        level_info(lev).flags &= ~LFILE_EXISTS;
    }
}

// C ref: files.c set_savefile_name() -- the UNIX branch
export function set_savefile_name(regularize_it) {
    const g = game;
    const regoffset = 5;
    g.SAVEF = `save/${HACK_UID}${g.plname}`;
    if (regularize_it)
        g.SAVEF = g.SAVEF.slice(0, regoffset) + regularize(g.SAVEF.slice(regoffset));
    /* no SAVE_EXTENSION; no compression indicator (nh_compress() isn't
       modelled) */
}

// C ref: files.c create_savefile()
export function create_savefile() {
    const fq_save = game.SAVEF; /* fqname(gs.SAVEF, SAVEPREFIX, 0) */
    const nhfp = new_nhfile();
    nhfp.ftype = NHF_SAVEFILE;
    nhfp.mode = WRITING;
    nhfp.structlevel = true;
    nhfp.fieldlevel = false;
    nhfp.name = fq_save;
    nhfp.fd = 1;
    nhfp.onclose = (f) => {
        if (!vfsWriteFile(f.name, nhfile_contents(f)))
            throw new Error('create_savefile(): no storage for the save file not ported yet');
    };
    return nhfp;
}

// C ref: files.c open_savefile()
export function open_savefile() {
    const fq_save = game.SAVEF;
    const data = vfsReadFile(fq_save);
    if (data === null)
        return null;
    const nhfp = new_nhfile();
    nhfp.ftype = NHF_SAVEFILE;
    nhfp.mode = READING;
    nhfp.structlevel = true;
    nhfp.fieldlevel = false;
    nhfp.name = fq_save;
    nhfp.fd = 1;
    nhfile_from_contents(nhfp, data);
    return nhfp;
}

// C ref: files.c delete_savefile()
export function delete_savefile() {
    vfsDeleteFile(game.SAVEF); /* unlink(fqname(gs.SAVEF, SAVEPREFIX, 0)) */
    return 0; /* for restore_saved_game() (ex-xxxmain.c) test */
}

// C ref: files.c restore_saved_game()
/* try to open up a save file and prepare to restore it */
export function restore_saved_game() {
    set_savefile_name(true);
    /* nh_uncompress(fq_save): no compression */
    let nhfp = open_savefile();
    if (nhfp) {
        if (validate(nhfp) !== SF_UPTODATE) {
            close_nhfile(nhfp);
            nhfp = null; /* problematic_savefile() */
        }
    }
    return nhfp;
}

// C ref: files.c get_freeing_nhfile()
export function get_freeing_nhfile() {
    const nhfp = new_nhfile(); /* also sets fd to -1 */
    nhfp.mode = FREEING;
    return nhfp;
}

// ---------------------------------------------------------------------
// version.c: the version record at the start of save and level files

/* JS writes and reads its own save format; this names it */
const SAVE_FORMAT_VERSION = 'teleport-js-1';
const SF_UPTODATE = 0;
const SF_OUTDATED = 1;

// C ref: version.c store_version()
export function store_version(nhfp) {
    Sfo(nhfp, SAVE_FORMAT_VERSION, "version_info");
}

// C ref: version.c validate()
export function validate(nhfp) {
    const v = Sfi(nhfp, "version_info");
    return (v === SAVE_FORMAT_VERSION) ? SF_UPTODATE : SF_OUTDATED;
}
