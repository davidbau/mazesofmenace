// Temporary libghostty-vt backend. A future pure-JS implementation need only
// provide write(bytes), writeByte(byte), snapshot(), and dispose().

let compiledModule;
async function loadModule() {
    if (!compiledModule) compiledModule = (async () => {
        const url = new URL('./vendor/libghostty/ghostty-vt-1.0.0.wasm', import.meta.url);
        const bytes = typeof process !== 'undefined' && process.versions?.node
            ? await (await import('node:fs/promises')).readFile(url)
            : new Uint8Array(await (await fetch(url)).arrayBuffer());
        return WebAssembly.compile(bytes);
    })();
    return compiledModule;
}

function check(result) {
    if (result !== 0) throw new Error(`libghostty-vt returned ${result}`);
}

export async function createTerminalBackend() {
    const instance = await WebAssembly.instantiate(await loadModule(), {});
    return new GhosttyTerminalBackend(instance.exports);
}

class GhosttyTerminalBackend {
    constructor(exports) {
        this.e = exports;
        const ptr = exports.ghostty_type_json();
        const bytes = new Uint8Array(exports.memory.buffer);
        const schema = JSON.parse(new TextDecoder().decode(bytes.subarray(ptr, bytes.indexOf(0, ptr))));
        if (schema.library_version !== '1.0.0' || schema.abi.pointer_size !== 4) {
            throw new Error('Unexpected libghostty-vt version or ABI');
        }
        this.slot = exports.ghostty_wasm_alloc_opaque();
        this.allocations = [];
        this.terminal = this.create('ghostty_terminal_new', 80, 24);
        this.formatter = this.create('ghostty_formatter_terminal_new', this.terminal);
        this.scratch = this.alloc(128);
        this.inputCapacity = 65536;
        this.inputPtr = this.alloc(this.inputCapacity);
        this.pending = new Uint8Array(this.inputCapacity);
        this.pendingLength = 0;
        // A scoring snapshot contains the visible screen, with no history.
        this.view().setUint32(this.scratch, 0, true);
        check(exports.ghostty_terminal_set(this.terminal, 28, this.scratch));
        check(exports.ghostty_formatter_set(this.formatter, 5, this.scratch)); // no state extras
        this.view().setUint32(this.scratch, 1, true);
        check(exports.ghostty_formatter_set(this.formatter, 1, this.scratch)); // VT format
        this.outputCapacity = 262144;
        this.outputPtr = this.alloc(this.outputCapacity);
        // ANSI_DEFAULT uses SO/SI but omits G1 designation during startup.
        this.write(new TextEncoder().encode("\x1b)0"));

    }
    create(name, ...args) {
        check(this.e[name](0, this.slot, ...args));
        return this.e.ghostty_wasm_take_opaque(this.slot);
    }
    alloc(length) {
        const ptr = this.e.ghostty_wasm_alloc(length);
        if (!ptr) throw new Error('libghostty allocation failed');
        this.allocations.push([ptr, length]);
        return ptr;
    }
    view() { return new DataView(this.e.memory.buffer); }
    writeByte(byte) {
        // Reproduce Unix tty OPOST/ONLCR: native stdout LF becomes CR LF.
        if (byte === 10) this.queueByte(13);
        this.queueByte(byte);
    }
    queueByte(byte) {
        if (this.pendingLength === this.pending.length) this.flush();
        this.pending[this.pendingLength++] = byte;
    }
    write(bytes) {
        // Already-terminal-encoded bytes; unlike stdout writeByte, no tty
        // newline conversion here. This is the replaceable backend interface.
        for (const byte of bytes) this.queueByte(byte);
    }
    flush() {
        if (!this.pendingLength) return;
        new Uint8Array(this.e.memory.buffer, this.inputPtr, this.pendingLength)
            .set(this.pending.subarray(0, this.pendingLength));
        this.e.ghostty_terminal_vt_write(this.terminal, this.inputPtr, this.pendingLength);
        this.pendingLength = 0;
    }
    snapshot() {
        this.flush();
        const e = this.e, out = this.scratch;
        // Ghostty serializes its own cells, including RGB and background styles.
        check(e.ghostty_formatter_format_buf(this.formatter, this.outputPtr, this.outputCapacity, out));
        const length = this.view().getUint32(out, true);
        const screen = new TextDecoder().decode(new Uint8Array(e.memory.buffer, this.outputPtr, length))
            .replace(/\r\n/g, '\n') // scorer's row separator
            .replace(/\x1b\[([0-9;]+)m/g, (escape, params) => {
                const tokens = params.split(';').map(Number), result = [];
                for (let i = 0; i < tokens.length; i++) {
                    const code = tokens[i];
                    if ((code === 38 || code === 48) && tokens[i + 1] === 5) {
                        const color = tokens[i + 2];
                        if (color < 16) result.push((code === 38 ? 30 : 40) + (color < 8 ? color : color + 52));
                        else result.push(code, 5, color);
                        i += 2;
                    } else if ((code === 38 || code === 48) && tokens[i + 1] === 2) {
                        result.push(...tokens.slice(i, i + 5)); i += 4;
                    } else result.push(code);
                }
                return `\x1b[${result.join(';')}m`;
            });
        const cursor = [];
        for (const field of [3, 4, 7]) {
            check(e.ghostty_terminal_get(this.terminal, field, out));
            const v = this.view();
            cursor.push(field === 7 ? Number(v.getUint8(out) !== 0) : v.getUint16(out, true));
        }
        return { screen, cursor };
    }
    dispose() {
        const e = this.e;
        e.ghostty_formatter_free(this.formatter);
        e.ghostty_terminal_free(this.terminal);
        for (const [ptr, size] of this.allocations) e.ghostty_wasm_free(ptr, size);
        e.ghostty_wasm_free_opaque(this.slot);
    }
}
