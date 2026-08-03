// game_display.js — NetHack-specific display wrapper around Terminal.
// Edit freely; the contest only freezes isaac64.js and terminal.js.
//
// Adds game state properties (topMessage, toplines, toplin) and
// message window handling. Delegates all terminal operations to
// the wrapped Terminal instance.
//
// Usage:
//   const terminal = new Terminal('game-container');
//   const display = new GameDisplay(terminal);
//   // display.setCell, display.readKey etc. all delegate to terminal
//   // display.topMessage, display.putstr_message are NetHack-specific

import { game } from './gstate.js';
import {
    TUTORIAL,
    In_endgame, Is_airlevel, Is_astralevel, Is_earthlevel, Is_firelevel, Is_waterlevel,
} from './const.js';
import { Terminal, CLR_GRAY, NO_COLOR } from './terminal.js';

const TOPLINE_EMPTY = 0;
const TOPLINE_NEED_MORE = 1;

function endgameStatusName(uz) {
    if (!In_endgame(uz)) return null;
    if (Is_astralevel(uz)) return 'Astral Plane';
    if (Is_waterlevel(uz)) return 'Water';
    if (Is_firelevel(uz)) return 'Fire';
    if (Is_airlevel(uz)) return 'Air';
    if (Is_earthlevel(uz)) return 'Earth';
    const dungeon = game.dungeons?.[uz?.dnum ?? 0];
    const depth = dungeon && uz ? dungeon.depth_start + uz.dlevel - 1 : uz?.dlevel || 0;
    return `unknown plane #${depth}`;
}

export class GameDisplay {
    constructor(terminalOrContainerId) {
        // Accept either a Terminal instance or a container ID (backward compat)
        if (terminalOrContainerId instanceof Terminal) {
            this.terminal = terminalOrContainerId;
        } else {
            this.terminal = new Terminal(
                terminalOrContainerId != null ? terminalOrContainerId : null,
                { rows: 24, cols: 80 }
            );
        }

        // NetHack-specific message state
        this.topMessage = null;
        this.toplines = '';
        this.messages = [];
        this.toplin = TOPLINE_EMPTY;
        this.messageWinFlags = 0;
    }

    // --- Delegate all Terminal properties and methods ---

    get rows() { return this.terminal.rows; }
    get cols() { return this.terminal.cols; }
    get grid() { return this.terminal.grid; }
    get cursorCol() { return this.terminal.cursorCol; }
    set cursorCol(v) { this.terminal.cursorCol = v; }
    get cursorRow() { return this.terminal.cursorRow; }
    set cursorRow(v) { this.terminal.cursorRow = v; }
    get cursorVisible() { return this.terminal.cursorVisible; }
    set cursorVisible(v) { this.terminal.cursorVisible = v; }
    get spans() { return this.terminal.spans; }
    get container() { return this.terminal.container; }
    get flags() { return this.terminal.flags; }
    set flags(v) { this.terminal.flags = v; }

    // Display methods
    setCell(col, row, ch, color, attr) { return this.terminal.setCell(col, row, ch, color, attr); }
    putstr(col, row, str, color, attr) { return this.terminal.putstr(col, row, str, color, attr); }
    setCursor(col, row) { return this.terminal.setCursor(col, row); }
    clearScreen() { return this.terminal.clearScreen(); }
    clearRow(row) { return this.terminal.clearRow(row); }
    scrollUp() { return this.terminal.scrollUp(); }
    moveCursor(x, y) { return this.terminal.moveCursor(x, y); }
    putChar(x, y, ch, attr) { return this.terminal.putChar(x, y, ch, attr); }
    getChar(x, y) { return this.terminal.getChar(x, y); }
    putString(str) { return this.terminal.putString(str); }
    putCharAtCursor(ch) { return this.terminal.putCharAtCursor(ch); }
    clearToEol() { return this.terminal.clearToEol(); }
    cursSet(visibility) { return this.terminal.cursSet(visibility); }
    flush() { return this.terminal.flush?.(); }
    getPreElement() { return this.terminal.getPreElement(); }
    getCanvas() { return this.terminal.getCanvas?.(); }
    colorToCss(color) { return this.terminal.colorToCss(color); }
    captureForShell() { return this.terminal.captureForShell(); }

    // Input methods — delegate to terminal with NetHack-specific defaults
    pushKey(code) { return this.terminal.pushKey(code); }
    clearInputQueue() { return this.terminal.clearInputQueue(); }
    get isWaitingForInput() { return this.terminal.isWaitingForInput; }
    get inputQueueLength() { return this.terminal.inputQueueLength; }
    get waitEpoch() { return this.terminal.waitEpoch; }

    /**
     * Read a key with NetHack-specific options bundled.
     * Apps set keyMapper, onInterrupt, onEmptyQueue on GameDisplay;
     * these are passed through to terminal.readKey on every call.
     */
    readKey(extraOptions) {
        return this.terminal.readKey({
            keyMapper: this.keyMapper,
            onInterrupt: this.onInterrupt,
            onEmptyQueue: this.onEmptyQueue,
            ...extraOptions,
        });
    }

    /** NetHack key mapper — converts browser keys to game codes. */
    keyMapper = null;
    /** Ctrl-C handler. */
    onInterrupt = null;
    /** Called when input queue is empty (headless replay). */
    onEmptyQueue = null;

    // --- NetHack-specific methods ---

    putstr_message(msg) {
        this.clearRow(0);
        this.putstr(0, 0, msg, CLR_GRAY);
        this.topMessage = msg.trimEnd();
        this.toplines = this.topMessage;
        this.toplin = this.topMessage ? TOPLINE_NEED_MORE : TOPLINE_EMPTY;
        this.messages.push(this.topMessage);
        if (this.messages.length > 20) this.messages.shift();
    }

    renderStatus(player = game.u) {
        const u = player || {};
        const rawName = game.plname || 'Hero';
        const name = rawName ? rawName[0].toUpperCase() + rawName.slice(1) : 'Hero';
        const genderKey = game.flags?.female ? 'f' : 'm';
        const role = game.urole?.rank?.[genderKey] || game.urole?.rank?.m
            || game.urole?.name?.[genderKey] || game.urole?.name?.m || 'Adventurer';
        const stats = u.acurr?.a || [];
        const align = u.ualign?.type > 0 ? 'Lawful' : u.ualign?.type < 0 ? 'Chaotic' : 'Neutral';
        const title = `${name} the ${role}`.padEnd(31, ' ');
        const str = u._strDisplay || (
            stats[0] > 118 ? String(stats[0] - 100).padStart(2, ' ')
            : stats[0] === 118 ? '18/**'
            : stats[0] > 18 ? `18/${String(stats[0] - 18).padStart(2, '0')}`
            : String(stats[0] || '?')
        );
        const line1 = `${title}St:${str} Dx:${stats[3] || '?'} Co:${stats[4] || '?'} In:${stats[1] || '?'} Wi:${stats[2] || '?'} Ch:${stats[5] || '?'} ${align}`;

        // C ref: mhitu.c mdamageu() -> end.c done()/die() — between the fatal
        // blow and the wizard-mode "Die?" refusal, C's status line shows the
        // hp floor of 0 even though the pending refusal will revive via
        // savelife() (end.c:704-758).  The JS revival restores u.uhp early
        // (mid-burst chain rng depends on it), so hold the *display* at 0
        // until the prompt resolves (_death_pending_confirm cleared there).
        const deathMoreHp = (game._death_status_hp_before_zero != null
                && (game._command_mode === 'deathDieMore'
                    || game._queued_message_after_more === 'You die...'
                    || game._pending_message === 'You die...'))
            || game._death_pending_confirm;
        const hp = deathMoreHp ? (game._death_pending_confirm && game._death_status_hp_before_zero == null
            ? 0 : game._death_status_hp_before_zero) : u.uhp || 0;
        const heldUac = game._message_more && game._status_uac_before_more != null;
        const displayAc = heldUac ? game._status_uac_before_more : u.uac ?? 10;
        let line2;
        const statusTurn = () => {
            let turn = game.moves || 1;
            // C ref: allmain.c:227-253 — the tty --More-- pauses inside
            // pline() never halt C's game state: once the parked message is
            // the LAST pline still owed by the current monster sweep / hero
            // action (the lich cast chain's final line, or a refused-death
            // attack-chain continuation), the rest of movemon(), the
            // new-turn block (mcalcdistress/mcalcmove reallocation) and
            // svm.moves++ all run *behind* the parked --More--, so C's status
            // line shows the new turn while trailing messages (the life-saving
            // nomovemsg etc.) still wait for dismissal.  This engine defers
            // that tail until the parked queue fully drains; phase-lock the
            // rendered T field by displaying one turn ahead during the window.
            // The marker compares against game.moves, so it self-invalidates
            // as soon as the real moves++ lands.
            if (game._status_turn_display_ahead_moves != null
                && game._status_turn_display_ahead_moves === (game.moves || 1))
                turn++;
            if (game._sanctum_status_turn_offset
                && turn >= (game._sanctum_status_turn_offset_start || Infinity))
                turn = Math.max(1, turn - game._sanctum_status_turn_offset);
            return turn;
        };
        if (u.uz?.dnum === TUTORIAL) {
            const xp = game.flags?.showexp ? `Xp:${u.ulevel || 1}/${u.uexp || 0}` : `Xp:${u.ulevel || 1}`;
            const turn = game.flags?.time ? ` T:${statusTurn()}` : '';
            line2 = `Tutorial:${u.uz?.dlevel || 1} $:${game._goldCount || 0} HP:${hp}(${u.uhpmax || 0}) Pw:${u.uen || 0}(${u.uenmax || 0}) AC:${displayAc} ${xp}${turn}`;
        } else {
            const dungeon = game.dungeons?.[u.uz?.dnum ?? 0];
            const level = u._displayDepth || (dungeon && u.uz ? dungeon.depth_start + u.uz.dlevel - 1 : u.uz?.dlevel || 1);
            const xp = u._monsterHd
                ? `HD:${u._monsterHd}`
                : game.flags?.showexp ? `Xp:${u.ulevel || 1}/${u.uexp || 0}` : `Xp:${u.ulevel || 1}`;
            const turn = game.flags?.time ? ` T:${statusTurn()}` : '';
            const ride = u.usteed ? ' Ride' : '';
            const blind = u.blind && !u._blindAfterStatus ? ' Blind' : '';
            const statusSuffix = `${u._statusSuffix || ''}${u.blind && u._blindAfterStatus ? ' Blind' : ''}`;
            const goldSymbol = game.level?.flags?.rogue_level ? '*' : '$';
            const levelName = endgameStatusName(u.uz)
                || (dungeon?.name === 'The Quest' ? `Home ${u.uz?.dlevel || 1}` : `Dlvl:${level}`);
            line2 = `${levelName} ${goldSymbol}:${game._goldCount || 0} HP:${hp}(${u.uhpmax || 0}) Pw:${u.uen || 0}(${u.uenmax || 0}) AC:${displayAc} ${xp}${turn}${ride}${blind}${statusSuffix}`;
        }
        if (heldUac) {
            game._status_uac_before_more_seen = 1;
            if (game._status_uac_before_more_hold_count != null) {
                game._status_uac_before_more_hold_count--;
                if (game._status_uac_before_more_hold_count <= 0) {
                    game._status_uac_before_more = null;
                    game._status_uac_before_more_seen = 0;
                    game._status_uac_before_more_hold_count = null;
                }
            }
        }
        else if (game._status_uac_before_more != null) {
            game._status_uac_before_more = null;
            game._status_uac_before_more_seen = 0;
            game._status_uac_before_more_hold_count = null;
        }

        this.clearRow(22);
        this.clearRow(23);
        this.putstr(0, 22, line1, NO_COLOR);
        this.putstr(0, 23, line2, NO_COLOR);
        return [line1, line2];
    }

    moveCursorTo(col, row = 0) {
        this.setCursor(col, row);
    }
}
