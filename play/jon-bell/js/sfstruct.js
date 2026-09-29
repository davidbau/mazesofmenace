// sfstruct.js — port of nethack-c/src/sfstruct.c (scaffold: functions are added here
// one packet at a time by the porting fleet; see tasks/generated/port-*.yaml)

const MAXFD = 5;
const NOFLG = 0;
const NOSLOT = 1;

let bw_sticky = [-1, -1, -1, -1, -1];
let bw_buffered = [0, 0, 0, 0, 0];
let bw_FILE = [null, null, null, null, null];

function panic(msg) {
    throw new Error(msg);
}

function getidx(fd, flg) {
    let i, retval = -1;

    for (i = 0; i < MAXFD; ++i)
        if (bw_sticky[i] === fd)
            return i;
    if (flg === NOSLOT)
        return retval;
    for (i = 0; i < MAXFD; ++i)
        if (bw_sticky[i] < 0) {
            bw_sticky[i] = fd;
            retval = i;
            break;
        }
    return retval;
}

export function bufon(fd) {
    let idx = getidx(fd, NOFLG);

    if (idx >= 0) {
        bw_sticky[idx] = fd;
        bw_buffered[idx] = 1;
    }
}

export function bflush(fd) {
    let idx = getidx(fd, NOFLG);

    if (idx >= 0) {
        if (bw_FILE[idx]) {
            /* fflush in C; in JS this is a no-op since bw_FILE entries are null */
        }
    }
}

export function close_check(fd) {
    let idx = getidx(fd, NOSLOT);
    let retval = false;

    if (idx >= 0)
        retval = true;
    return true;
}

export function bclose(fd) {
    let idx = getidx(fd, NOSLOT);
    bufoff(fd);
    if (idx >= 0) {
        if (bw_FILE[idx]) {
            fclose(bw_FILE[idx]);
            bw_FILE[idx] = null;
        } else {
            close(fd);
        }
        bw_sticky[idx] = -1;
    }
}

function bufoff(fd) {
    let idx = getidx(fd, NOFLG);
    if (idx >= 0) {
        bflush(fd);
        bw_buffered[idx] = 0;
    }
}

function fclose(fp) { /* no-op stub */ }
function close(fd) { /* no-op stub */ }
