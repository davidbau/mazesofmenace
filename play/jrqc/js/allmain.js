// js/allmain.js: interactive play over the transpiled build. Hand-written glue.
//
// The contract of index.html and frozen/playability_runner.mjs:
//   const g = new NethackGame({ seed, nethackrc, datetime?, storage? });
//   g._pendingDisplay = display;   (and/or game.nhDisplay = display)
//   await g.start();                         // boot to the first key wait
//   for (;;) { await moveloop_core(); if (game.program_state?.gameover) break; }
//
// The game is one process (js/nhprocess.js) running as a coroutine: whenever
// it reads a key it hands control back to the driver. moveloop_core() lets it
// take exactly one key and run until it waits for the next one (or exits), so
// each call is one input step. Keys come from the display's queue
// (Terminal.readKey: keyboard or pushKey); when the queue is empty,
// moveloop_core consults display.onEmptyQueue before resuming the game, so a
// replay driver can stop there. The screen is drawn from the tty port's
// input-boundary and animation markers (GameDisplay.showScreen), encoded as the
// recordings are.
import { bootProcess, encodeScreen } from './nhprocess.js';
import { game } from './gstate.js';
import { GameDisplay } from './game_display.js';
import { KEY_BINDINGS } from './terminal.js';
import { iflags } from './nh/decl.js';

// Arrow keys for browser play (the terminal's default is xterm's ESC [ A..D, which
// the tty port reads as three commands). Chosen at every key read from the game's
// number_pad option (iflags.num_pad): off, the vi keys (Shift+arrow runs); on, the
// digits (Shift+arrow moves one step too: number_pad has no shifted run key).
const NUMPAD_ARROWS = {
    ArrowUp: '8', ArrowDown: '2', ArrowLeft: '4', ArrowRight: '6',
    'Shift+ArrowUp': '8', 'Shift+ArrowDown': '2', 'Shift+ArrowLeft': '4', 'Shift+ArrowRight': '6',
};
const arrowBindings = () => (iflags.num_pad ? NUMPAD_ARROWS : KEY_BINDINGS.VI_KEYS);

let current = null;

/** Local time as YYYYMMDDHHMMSS (the browser plays at the real date: moon phase, Friday 13th). */
function nowStamp() {
    const d = new Date(), p = (n, w = 2) => String(n).padStart(w, '0');
    return `${p(d.getFullYear(), 4)}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export class NethackGame {
    constructor({ seed = 0, nethackrc = '', datetime = null, storage = null } = {}) {
        this.seed = seed; this.nethackrc = nethackrc; this.datetime = datetime || nowStamp();
        this._storage = storage; this._pendingStorage = null; this._pendingDisplay = null;
        this.display = null;
        this.exited = false; this.exitStatus = null; this.error = null;
        this._grant = null;      // resolves the game's pending key request
        this._parked = null;     // resolves the driver when the game waits for a key or exits
    }

    /** Resolves when the game next waits for a key or exits. */
    _untilParked() { return new Promise((res) => { this._parked = res; }); }
    _park() { const r = this._parked; this._parked = null; if (r) r(); }

    async start() {
        this.display = this._pendingDisplay || game.nhDisplay || new GameDisplay(null);
        game.nhDisplay = this.display;
        game.program_state = { gameover: false };
        current = this;
        const storage = this._pendingStorage || this._storage || null;
        const parked = this._untilParked();
        const p = bootProcess({
            seed: this.seed, datetime: this.datetime, nethackrc: this.nethackrc, storage,
            // drawn as recorded (encodeScreen: blank runs become cursor moves, as the judge sees them)
            onMarker: (m) => { if (m.kind === 'input' || m.kind === 'anim') this.display.showScreen(encodeScreen(m.payload), m.cx, m.cy); },
            onRng: null,
            readKey: async () => {
                // an input boundary: give control back, wait for moveloop_core's go-ahead
                const go = new Promise((res) => { this._grant = res; });
                this._park();
                await go;
                const k = await this.display.readKey({ bindings: arrowBindings() });
                return k === 13 ? 10 : k;   // the recorder's tty (ICRNL)
            },
        });
        p.done.then((r) => {
            this.exited = true;
            if (r.error) { this.error = r.error; console.error(r.error); } else this.exitStatus = r.status;
            game.program_state.gameover = true;
            this._park();
        });
        await parked;
    }
}

/** One input step of the current game: one key in, run to the next key wait or the end. */
export async function moveloop_core() {
    const g = current;
    if (!g || g.exited) { game.program_state = { ...(game.program_state || {}), gameover: true }; return; }
    const d = g.display;
    if (d.inputQueueLength === 0 && typeof d.onEmptyQueue === 'function') {
        const k = d.onEmptyQueue();   // may throw (end of a replay)
        if (k !== undefined && k !== null) d.pushKey(k);
    }
    const parked = g._untilParked();
    const grant = g._grant;
    g._grant = null;
    if (grant) grant();
    await parked;
}
