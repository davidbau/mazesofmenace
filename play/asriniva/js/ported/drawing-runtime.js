// Materialize the original C-visible constant arrays from the JS TU tables.
// The caller runs this once for each module before its C initialization begins.
export function initializeDrawing(services, layout, tables) {
    if (layout.pointerSize !== 8 || layout.CHAR_BIT !== 8
        || layout.classSymSize !== 1 || !layout.classSymSigned
        || layout.symdefSymSize !== 1 || layout.symdefColorSize !== 1)
        throw new Error('Review changed drawing table ABI');

    const classTables = [
        [tables.def_oc_syms, services.objectSymbols, layout.MAXOCLASSES],
        [tables.def_monsyms, services.monsterSymbols, layout.MAXMCLASSES],
    ];
    const symbolTables = [
        [tables.def_warnsyms, services.warningSymbols, layout.WARNCOUNT],
        [tables.defsyms, services.symbols, layout.MAXPCHARS + 1],
    ];
    for (const [table, , count] of [...classTables, ...symbolTables])
        if (table.length !== count)
            throw new Error(`Drawing table length ${table.length} does not match C ${count}`);
    if (tables.def_r_oc_syms.length !== layout.MAXOCLASSES)
        throw new Error('Rogue object table length does not match C');

    const strings = new Map();
    const encoder = new TextEncoder();
    function stringPointer(text) {
        if (text === null) return 0;
        if (typeof text !== 'string') throw new Error('Expected a drawing table string');
        if (!strings.has(text)) {
            const bytes = encoder.encode(text);
            const pointer = Number(services.malloc(bytes.length + 1));
            if (!pointer) throw new Error('Unable to allocate drawing table string');
            services.heap().set(bytes, pointer);
            services.heap()[pointer + bytes.length] = 0;
            strings.set(text, pointer);
        }
        return strings.get(text);
    }
    const view = () => new DataView(services.heap().buffer);
    function writePointer(at, text) {
        const pointer = stringPointer(text);
        view().setBigUint64(at, BigInt(pointer), true);
    }

    for (const [table, base, count] of classTables) {
        const start = Number(base());
        services.heap().fill(0, start, start + count * layout.classSize);
        for (let index = 0; index < count; ++index) {
            const at = start + index * layout.classSize;
            const entry = table[index];
            view().setInt8(at + layout.classSym, entry.sym);
            writePointer(at + layout.className, entry.name);
            writePointer(at + layout.classExplain, entry.explain);
        }
    }
    for (const [table, base, count] of symbolTables) {
        const start = Number(base());
        services.heap().fill(0, start, start + count * layout.symdefSize);
        for (let index = 0; index < count; ++index) {
            const at = start + index * layout.symdefSize;
            const entry = table[index];
            view().setUint8(at + layout.symdefSym, entry.sym);
            writePointer(at + layout.symdefExplanation, entry.explanation);
            view().setUint8(at + layout.symdefColor, entry.color);
        }
    }
    const rogue = Number(services.rogueSymbols());
    services.heap().fill(0, rogue, rogue + layout.MAXOCLASSES);
    services.heap().set(tables.def_r_oc_syms, rogue);
}
