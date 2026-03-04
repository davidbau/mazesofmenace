#!/usr/bin/env node
// Run a scripted C NetHack session via tmux while C keylog instrumentation records inputs.

import { TmuxAdapter } from '../interface/tmux_adapter.js';
import { writeFileSync } from 'fs';

function parseArgs(argv) {
    const opts = {
        seed: 1,
        role: 'Valkyrie',
        race: 'human',
        gender: 'female',
        align: 'neutral',
        name: 'Recorder',
        wizard: true,
        tutorial: false,
        symset: 'DECgraphics',
        keyDelay: 50,
        session: `scripted-${Date.now()}`,
        tmuxSocket: process.env.SELFPLAY_TMUX_SOCKET || 'default',
        fixedDatetime: '20000110090000',
        keylog: null,
        movesBase64: null,
    };

    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--wizard') opts.wizard = true;
        else if (a === '--no-wizard') opts.wizard = false;
        else if (a === '--tutorial') opts.tutorial = true;
        else if (a === '--no-tutorial') opts.tutorial = false;
        else if (a.startsWith('--seed=')) opts.seed = Number(a.slice(7));
        else if (a.startsWith('--role=')) opts.role = a.slice(7);
        else if (a.startsWith('--race=')) opts.race = a.slice(7);
        else if (a.startsWith('--gender=')) opts.gender = a.slice(9);
        else if (a.startsWith('--align=')) opts.align = a.slice(8);
        else if (a.startsWith('--name=')) opts.name = a.slice(7);
        else if (a.startsWith('--symset=')) opts.symset = a.slice(9);
        else if (a.startsWith('--key-delay=')) opts.keyDelay = Number(a.slice(12));
        else if (a.startsWith('--session=')) opts.session = a.slice(10);
        else if (a.startsWith('--tmux-socket=')) opts.tmuxSocket = a.slice(14);
        else if (a.startsWith('--datetime=')) opts.fixedDatetime = a.slice(11);
        else if (a.startsWith('--keylog=')) opts.keylog = a.slice(9);
        else if (a.startsWith('--moves-base64=')) opts.movesBase64 = a.slice(15);
    }

    if (!opts.keylog) {
        throw new Error('--keylog is required');
    }
    if (!opts.movesBase64) {
        throw new Error('--moves-base64 is required');
    }
    return opts;
}

function buildNethackOptions(opts) {
    const rc = [
        `OPTIONS=name:${opts.name}`,
        `OPTIONS=race:${opts.race}`,
        `OPTIONS=role:${opts.role}`,
        `OPTIONS=gender:${opts.gender}`,
        `OPTIONS=align:${opts.align}`,
        'OPTIONS=showexp',
        'OPTIONS=!autopickup',
        'OPTIONS=suppress_alert:3.4.3',
        opts.tutorial ? 'OPTIONS=tutorial' : 'OPTIONS=!tutorial',
    ];
    if (opts.symset === 'DECgraphics') {
        rc.push('OPTIONS=symset:DECgraphics');
    }
    return rc;
}

function hasMorePrompt(grid) {
    if (!grid) return false;
    for (const row of grid) {
        const line = row.map((c) => c.ch).join('');
        if (line.includes('--More--')) return true;
    }
    return false;
}

async function clearPendingMore(adapter, maxClears = 20) {
    let clears = 0;
    while (clears < maxClears) {
        if (!(await adapter.isRunning())) break;
        const grid = await adapter.readScreen();
        if (!hasMorePrompt(grid)) break;
        await adapter.sendKey(' ');
        clears += 1;
    }
    return clears;
}

async function main() {
    const opts = parseArgs(process.argv);
    const moves = Buffer.from(opts.movesBase64, 'base64').toString('utf8');

    const metadata = {
        type: 'meta',
        seed: opts.seed,
        role: opts.role,
        race: opts.race,
        gender: opts.gender,
        align: opts.align,
        name: opts.name,
        wizard: opts.wizard,
        tutorial: opts.tutorial,
        symset: opts.symset,
        datetime: opts.fixedDatetime,
        keylogDelayMs: 0,
        nethackOptions: buildNethackOptions(opts),
        scripted: true,
        scriptedKeyCount: moves.length,
        recordedAt: new Date().toISOString(),
    };
    writeFileSync(opts.keylog, JSON.stringify(metadata) + '\n');

    process.env.NETHACK_KEYLOG = opts.keylog;
    process.env.NETHACK_KEYLOG_DELAY_MS = '0';
    process.env.NETHACK_FIXED_DATETIME = opts.fixedDatetime;
    if (opts.tmuxSocket) {
        process.env.SELFPLAY_TMUX_SOCKET = opts.tmuxSocket;
    }

    const adapter = new TmuxAdapter({
        sessionName: opts.session,
        keyDelay: opts.keyDelay,
        symset: opts.symset,
        tmuxSocket: opts.tmuxSocket,
    });

    let sent = 0;
    let autoMoreSpaces = 0;
    try {
        await adapter.start({
            seed: opts.seed,
            role: opts.role,
            race: opts.race,
            gender: opts.gender,
            align: opts.align,
            name: opts.name,
            wizard: opts.wizard,
            tutorial: opts.tutorial,
        });

        for (const ch of moves) {
            if (!(await adapter.isRunning())) break;
            autoMoreSpaces += await clearPendingMore(adapter);
            await adapter.sendKey(ch);
            sent += 1;
        }
        autoMoreSpaces += await clearPendingMore(adapter);
    } finally {
        await adapter.stop();
        console.log(`sent_keys=${sent}`);
        console.log(`auto_more_spaces=${autoMoreSpaces}`);
        console.log(`keylog=${opts.keylog}`);
    }
}

main().catch((err) => {
    console.error(err?.stack || String(err));
    process.exit(1);
});
