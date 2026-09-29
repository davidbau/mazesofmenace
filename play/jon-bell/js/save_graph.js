// The VFS save owns a detached graph, like C's save file owns bytes.  Object
// identities are edges in the file, never references into a running game.
import { GameMap, makeLocation, newobj } from './game.js';

const rmProto = Object.getPrototypeOf(makeLocation());
const objProto = Object.getPrototypeOf(newobj());

const prototypes = new Map([
    [Object.prototype, 'object'], [null, 'null'],
    [GameMap.prototype, 'level'], [rmProto, 'location'],
    [objProto, 'obj'],
]);
const typedArrays = new Map([
    Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array,
    Int32Array, Uint32Array, Float32Array, Float64Array, BigInt64Array,
    BigUint64Array,
].map(ctor => [ctor.name, ctor]));

export function encode_save_graph(root) {
    const ids = new WeakMap(), nodes = [];
    function edge(value) {
        if (value === undefined) return { special: 'undefined' };
        if (typeof value === 'bigint') return { bigint: String(value) };
        if (typeof value === 'number' && (!Number.isFinite(value) || Object.is(value, -0)))
            return { special: Object.is(value, -0) ? '-0' : String(value) };
        if (value === null || ['string', 'number', 'boolean'].includes(typeof value))
            return value;
        if (typeof value !== 'object')
            throw new TypeError(`Nonpersistent save value: ${typeof value}`);
        if (ids.has(value)) return { ref: ids.get(value) };
        const id = nodes.length, node = {};
        ids.set(value, id); nodes.push(node);
        if (Array.isArray(value)) {
            node.type = 'array'; node.length = value.length;
        } else if (value instanceof Map) {
            node.type = 'map'; node.entries = [...value].map(([k, v]) => [edge(k), edge(v)]);
        } else if (value instanceof Set) {
            node.type = 'set'; node.values = [...value].map(edge);
        } else if (value instanceof ArrayBuffer) {
            node.type = 'buffer'; node.bytes = [...new Uint8Array(value)];
        } else if (ArrayBuffer.isView(value)) {
            node.type = 'view'; node.kind = value instanceof DataView ? 'DataView' : value.constructor.name;
            if (node.kind !== 'DataView' && !typedArrays.has(node.kind))
                throw new TypeError(`Unsupported save view: ${node.kind}`);
            node.buffer = edge(value.buffer); node.offset = value.byteOffset;
            node.length = value instanceof DataView ? value.byteLength : value.length;
        } else if (value instanceof Date) {
            node.type = 'date'; node.value = edge(value.getTime());
        } else {
            node.type = prototypes.get(Object.getPrototypeOf(value));
            if (!node.type) throw new TypeError('Unsupported save object prototype');
        }
        node.props = [];
        for (const key of Object.keys(value)) {
            // Indexed view elements are already stored in the shared buffer.
            if (node.type === 'view' && /^(0|[1-9][0-9]*)$/.test(key)) continue;
            const descriptor = Object.getOwnPropertyDescriptor(value, key);
            if (!('value' in descriptor)) throw new TypeError(`Save accessor: ${key}`);
            node.props.push([key, edge(descriptor.value)]);
        }
        return { ref: id };
    }
    const entry = edge(root);
    return JSON.stringify({ version: 1, entry, nodes });
}

export function decode_save_graph(body) {
    const graph = JSON.parse(body);
    if (graph.version !== 1 || !Array.isArray(graph.nodes)) throw new TypeError('Invalid save graph');
    const objects = new Array(graph.nodes.length);
    const protoByName = new Map([...prototypes].map(([proto, name]) => [name, proto]));
    function edge(value) {
        if (value === null || typeof value !== 'object') return value;
        if (Object.hasOwn(value, 'ref')) {
            if (!Number.isInteger(value.ref) || value.ref < 0 || value.ref >= objects.length)
                throw new TypeError('Invalid save reference');
            return objects[value.ref];
        }
        if (Object.hasOwn(value, 'bigint')) return BigInt(value.bigint);
        switch (value.special) {
        case 'undefined': return undefined;
        case '-0': return -0;
        case 'NaN': return NaN;
        case 'Infinity': return Infinity;
        case '-Infinity': return -Infinity;
        default: throw new TypeError('Invalid save scalar');
        }
    }
    // Allocate identities before installing any edges, including cycles.
    graph.nodes.forEach((node, i) => {
        switch (node.type) {
        case 'array': objects[i] = new Array(node.length); break;
        case 'map': objects[i] = new Map(); break;
        case 'set': objects[i] = new Set(); break;
        case 'buffer': objects[i] = Uint8Array.from(node.bytes).buffer; break;
        case 'date': objects[i] = new Date(edge(node.value)); break;
        case 'view': break; // buffer identities must exist first
        default:
            if (!protoByName.has(node.type)) throw new TypeError('Unknown save node');
            objects[i] = Object.create(protoByName.get(node.type));
        }
    });
    graph.nodes.forEach((node, i) => {
        if (node.type !== 'view') return;
        const buffer = edge(node.buffer);
        if (!(buffer instanceof ArrayBuffer)) throw new TypeError('Invalid save view buffer');
        const ctor = node.kind === 'DataView' ? DataView : typedArrays.get(node.kind);
        if (!ctor) throw new TypeError('Unknown save view');
        objects[i] = new ctor(buffer, node.offset, node.length);
    });
    graph.nodes.forEach((node, i) => {
        const value = objects[i];
        if (node.type === 'map') for (const [k, v] of node.entries) value.set(edge(k), edge(v));
        if (node.type === 'set') for (const v of node.values) value.add(edge(v));
        for (const [key, item] of node.props) {
            Object.defineProperty(value, key, {
                value: edge(item), enumerable: true, writable: true, configurable: true,
            });
        }
    });
    return edge(graph.entry);
}
