// js/hand/files.js: hand-written replacement of files.c docompress_file()
// (transpiler/annotations.jsonc functions["src/files.c::docompress_file"]).
//
// C (src/files.c:1591, COMPRESS "/usr/bin/compress", COMPRESS_EXTENSION ".Z"):
// fork(); the child prints raw_print("") (TTY), redirects stdin/stdout to the
// two files and execv()s compress (or compress -d); the parent wait()s and, on
// exit status 0, unlinks the input file (filename, or filename.Z when
// uncompressing). The recorder really runs compress at every save and restore.
//
// A process cannot be forked here, so this keeps C's parent and models the
// child by its effects that the parent can observe:
//   - the files: compress turns filename into filename.Z (compress -d the
//     reverse). Only this port reads the file, so the bytes move unchanged.
//   - the child's raw_print("") reaches the real terminal, not the recorded
//     screens: they come from the recorder process's own capture grid
//     (patch 006 NOMUX markers), which the child's copy cannot change.
//   - its exit status: 0 when its input file opens, else 1 (redirect() fails
//     and the child calls nh_terminate(EXIT_FAILURE)), as compress succeeds
//     on any readable file.
// Everything the parent does after wait() is the C code, line for line.
import * as $c from '../crt/index.js';
import { $G } from '../nh/globals.js';
import { iflags } from '../nh/decl.js';
import { windowprocs } from '../nh/windows.js';
import { raw_printf } from '../nh/pline.js';
import { more } from '../nh/topl.js';

const NHW_TTY = 1;   // windowprocs.wp_id of the tty interface (WINDOWPORT(tty))

export async function docompress_file(filename, uncomp) {
    const name = $c.cstrToJs(filename);
    const cname = name + '.Z';
    const cfn = $c.lit(cname);
    const istty = windowprocs.wp_id === NHW_TTY;
    // when compressing, we know the file exists
    if (uncomp && $c.access(cfn, 0) !== 0) return;
    if (istty) await windowprocs.win_mark_synch();
    // the child: input and output files, then compress
    const input = uncomp ? cfn : filename, output = uncomp ? filename : cfn;
    let childstatus;
    if ($c.access(input, 0) !== 0) childstatus = 1;
    else {
        const fd = $c.open(input, $c.O.RDONLY, 0);
        const chunks = [];
        const buf = new Int8Array(8192);
        for (let n; (n = $c.read(fd, new $c.Ptr(buf, 0), buf.length)) > 0;) chunks.push(buf.slice(0, n));
        $c.close(fd);
        const out = $c.open(output, $c.O.WRONLY | $c.O.CREAT | $c.O.TRUNC, 0o644);
        for (const c of chunks) $c.write(out, new $c.Ptr(c, 0), c.length);
        $c.close(out);
        childstatus = 0;
    }
    // back in parent (wait() returned the child's status)
    if (childstatus === 0) {
        // (un)compress succeeded: remove file left behind
        if (uncomp) $c.unlink(cfn);
        else $c.unlink(filename);
    } else {
        // (un)compress failed; remove the new, bad file
        if (uncomp) {
            await raw_printf($c.lit('Unable to uncompress %s'), filename);
            $c.unlink(filename);
        } else {
            $c.unlink(cfn);
        }
        if (istty && iflags.window_inited) {
            await windowprocs.win_clear_nhwindow($G.WIN_MESSAGE);
            await more();
        }
    }
}
