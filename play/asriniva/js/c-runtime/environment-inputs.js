// Store C environment names as byte strings. Host inputs arrive as Unicode,
// while setenv() may supply any non-NUL bytes, including invalid UTF-8.
export function createEnvironmentInputs(base, initial = {}) {
    const {memory} = base;
    const variables = new Map();
    const utf8 = new TextEncoder();
    function store(name, value) {
        const previous = variables.get(name);
        if (value == null) variables.delete(name);
        else variables.set(name, memory.cstring(value));
        if (previous) memory.free(previous);
    }
    function storeHostValue(name, value) {
        let key = '';
        for (const byte of utf8.encode(name)) key += String.fromCharCode(byte);
        store(key, value == null ? null : utf8.encode(String(value)));
    }
    for (const [name, value] of Object.entries(initial)) storeHostValue(name, value);
    return {
        getenv: name => variables.get(typeof name === 'string' ? name : memory.readString(Number(name))) ?? 0,
        setEnvironment(name, value) {
            base.setEnvironment?.(name, value);
            storeHostValue(name, value);
        },
        setBytes: store,
    };
}
