// play.js — interactive play: the browser page and the judge's
// playability check (frozen/playability_runner.mjs).
//
// Replay (js/jsmain.js runSegment) knows every key in advance, so the
// compiled game runs straight through.  A player types one key at a time,
// so play uses js/nethack-c-play.js: the same C compiled with Asyncify,
// whose key read awaits a promise.  The game runs until it wants a key and
// pauses there; moveloop_core() (js/allmain.js) hands it the next key and
// waits for the next pause.  Each frame of the C shadow buffer is drawn
// into the page's Terminal.

import { game } from './gstate.js';
import { DEC_TO_UNICODE } from './terminal.js';
import {
    HACKDIR, consoleHooks, environmentSetup, installFiles, keyByte,
    persistFiles, playerName,
} from './jsmain.js';

// Terminal colors are NetHack's CLR_* numbers.  The capture writes the
// dark-gray stand-in for black (SGR 90, index 8) where NetHack's own
// table has NO_COLOR, so draw it as CLR_BLACK, which the page shows gray.
function sgrColor(fg) {
    return fg === 8 ? 0 : fg;
}

// Draw one captured frame: 24 rows of text with SGR color/attribute codes
// and SO/SI around DEC line-drawing characters (see nomux_capture_screen
// in nethack-c/patches/006-nomux-capture.patch).
export function drawFrame(display, payload, cx, cy) {
    const rows = payload.split('\n');
    for (let r = 0; r < 24; r++) {
        const line = rows[r] || '';
        let col = 0;
        let fg = 7;
        let attr = 0;
        let dec = false;
        for (let i = 0; i < line.length && col < 80;) {
            const ch = line[i];
            if (ch === '\x1b' && line[i + 1] === '[') {
                let j = i + 2;
                while (j < line.length && line[j] !== 'm') j++;
                for (const p of line.slice(i + 2, j).split(';').map(Number)) {
                    if (p === 0) { fg = 7; attr = 0; }
                    else if (p === 1) attr |= 2;
                    else if (p === 22) attr &= ~2;
                    else if (p === 4) attr |= 4;
                    else if (p === 24) attr &= ~4;
                    else if (p === 7) attr |= 1;
                    else if (p === 27) attr &= ~1;
                    else if (p === 39) fg = 7;
                    else if (p >= 30 && p <= 37) fg = p - 30;
                    else if (p >= 90 && p <= 97) fg = p - 90 + 8;
                }
                i = j + 1;
                continue;
            }
            if (ch === '\x0e') { dec = true; i++; continue; }
            if (ch === '\x0f') { dec = false; i++; continue; }
            display.setCell(col++, r, dec ? (DEC_TO_UNICODE[ch] || ch) : ch, sgrColor(fg), attr);
            i++;
        }
        for (; col < 80; col++) display.setCell(col, r, ' ', 7, 0);
    }
    display.setCursor(cx, cy);
}

// The page passes no datetime; play at the player's own date and time.
function localDatetime() {
    const d = new Date();
    const p = (n, w = 2) => String(n).padStart(w, '0');
    return `${p(d.getFullYear(), 4)}${p(d.getMonth() + 1)}${p(d.getDate())}`
        + `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export class NethackGame {
    constructor(opts = {}) {
        this._seed = opts.seed ?? 0;
        this._datetime = opts.datetime || null;
        this._nethackrc = opts.nethackrc || '';
        this._storage = opts.storage || null;
        this._pendingDisplay = null;
        this.exited = false;
        this._M = null;
        this._giveKey = null;   // resolves the game's pending key read
        this._pause = null;     // settles when the game pauses or exits
    }

    _nextPause() {
        let settle;
        const promise = new Promise((resolve) => { settle = resolve; });
        this._pause = { promise, settle };
        return promise;
    }

    _paused() {
        this._pause?.settle();
    }

    _exited() {
        this.exited = true;
        if (game.program_state) game.program_state.gameover = true;
        if (this._M) persistFiles(this._M.FS, this._storage);
        this._paused();
    }

    // Start the game and run it until it first waits for a key.
    async start() {
        const display = this._pendingDisplay || game.nhDisplay || null;
        this._pendingDisplay = null;
        game.nhDisplay = display;
        game.nhGame = this;
        game.program_state = { gameover: false };

        const { default: createNetHackPlay } = await import('./nethack-c-play.js');
        const firstPause = this._nextPause();
        const M = await createNetHackPlay({
            noInitialRun: true,
            thisProgram: `${HACKDIR}/nethack`,
            preRun: [environmentSetup({
                seed: this._seed,
                datetime: this._datetime || localDatetime(),
            })],
            ...consoleHooks(),
            nhNextKey: () => new Promise((resolve) => {
                this._giveKey = resolve;
                this._paused();
            }),
            nhFrame: (isInput, seq, cx, cy, payload) => {
                if (display) drawFrame(display, payload, cx, cy);
            },
            onExit: () => this._exited(),
        });
        this._M = M;
        installFiles(M.FS, { nethackrc: this._nethackrc, storage: this._storage });
        try {
            M.callMain(['-u', playerName(this._nethackrc)]);
        } catch (e) {
            if (e?.name !== 'ExitStatus') throw e;
            this._exited();
        }
        await firstPause;
    }

    // Give the game one key and wait until it wants the next one.
    async feedKey(code) {
        if (this.exited || !this._giveKey) return;
        const give = this._giveKey;
        this._giveKey = null;
        const pause = this._nextPause();
        give(keyByte(code));
        await pause;
    }
}
