// persistence.js - the engine's in-memory filesystem (Emscripten MEMFS),
// seen from the JS host.
//
// Two jobs:
//   1. Carry files from one segment to the next (save files, bones,
//      record, ...) through the Web-Storage-shaped `storage` the judge or
//      the browser provides: restorePersistentFs() before a segment,
//      snapshotPersistentFs() after it.
//   2. FsJournal: let interactive play rewind the filesystem to the last
//      snapshot point, together with the heap (see jsmain.js).

import { InMemoryStorage } from "./storage.js";

const VFS_PREFIX = "vfs:";
const FS_MANIFEST_PATH = "/.nhjs-fs-manifest.json";
const SKIP_FS_PREFIXES = ["/dev", "/proc", "/tmp", "/home"];

export function storageForInput(input) {
  return input?.storage || new InMemoryStorage();
}

function storageKey(path) {
  return `${VFS_PREFIX}${path}`;
}

// Files are stored as binary strings (one char per byte), so text files
// such as /record stay readable through storage.js vfsReadFile().
function bytesToBinary(bytes) {
  let text = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    text += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return text;
}

function binaryToBytes(text) {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff;
  return bytes;
}

function ensureDir(FS, path) {
  let cur = "";
  for (const part of path.split("/").filter(Boolean)) {
    cur += `/${part}`;
    try {
      FS.mkdir(cur);
    } catch {
      // already there
    }
  }
}

function parentDir(path) {
  const idx = path.lastIndexOf("/");
  return idx <= 0 ? "/" : path.slice(0, idx);
}

function skippedPath(path) {
  return SKIP_FS_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

// Every file and directory under / (except device/proc trees) as
// [path, node] pairs, parents before children.
export function walkFs(FS) {
  const out = [];
  const visit = (dir, base) => {
    for (const name of Object.keys(dir.contents || {})) {
      const node = dir.contents[name];
      const path = `${base}/${name}`;
      if (skippedPath(path)) continue;
      out.push([path, node]);
      if (FS.isDir(node.mode)) visit(node, path);
    }
  };
  visit(FS.root, "");
  return out;
}

function readManifest(storage) {
  try {
    const raw = storage.getItem(storageKey(FS_MANIFEST_PATH));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function restorePersistentFs(FS, storage) {
  const manifest = readManifest(storage);
  if (!manifest) return;
  for (const dir of manifest.dirs || []) ensureDir(FS, dir);
  for (const path of manifest.files || []) {
    const raw = storage.getItem(storageKey(path));
    if (raw === null) continue;
    ensureDir(FS, parentDir(path));
    FS.writeFile(path, binaryToBytes(raw));
  }
}

// `skip` holds paths that are reinstalled at every start (game data,
// sysconf, .nethackrc, the RNG log) and need not be carried over.
export function snapshotPersistentFs(FS, storage, skip = new Set()) {
  const previous = readManifest(storage);
  const dirs = [];
  const files = [];
  for (const [path, node] of walkFs(FS)) {
    if (skip.has(path)) continue;
    if (FS.isDir(node.mode)) {
      dirs.push(path);
    } else if (FS.isFile(node.mode)) {
      files.push(path);
      storage.setItem(
        storageKey(path),
        bytesToBinary(node.contents.subarray(0, node.usedBytes)),
      );
    }
  }
  const live = new Set(files);
  for (const old of previous?.files || []) {
    if (!live.has(old)) storage.removeItem(storageKey(old));
  }
  storage.setItem(
    storageKey(FS_MANIFEST_PATH),
    JSON.stringify({ version: 2, dirs, files }),
  );
}

// FsJournal: an undo log for MEMFS between two snapshot points.
//
// mark() starts a new epoch.  From then on the first write, truncate or
// chmod of each file records what is needed to undo it (its size, and a
// copy of its bytes only if old bytes get overwritten: appends such as
// the RNG log cost nothing).  Directory changes (create, unlink, rename)
// set a flag so that rollback() can compare the tree with the one seen at
// mark().  rollback() puts files, the directory tree and the open file
// descriptors back as they were at mark().
export class FsJournal {
  constructor(FS) {
    this.FS = FS;
    this.undo = new Map();
    this.treeChanged = true;
    this.tree = null;
    this.streams = null;
    this.nextInode = 0;
    this._hook();
  }

  _hook() {
    const FS = this.FS;
    const probe = "/.nhjs-journal-probe";
    FS.writeFile(probe, "");
    const fileNode = FS.lookupPath(probe).node;
    const dirNode = FS.root;
    FS.unlink(probe);
    const journal = this;
    const streamOps = fileNode.stream_ops;
    const fileOps = fileNode.node_ops;
    const dirOps = dirNode.node_ops;
    const write = streamOps.write;
    streamOps.write = function (stream, buffer, offset, length, position, canOwn) {
      if (length) journal._touch(stream.node, position);
      return write.call(this, stream, buffer, offset, length, position, canOwn);
    };
    const setattr = fileOps.setattr;
    fileOps.setattr = function (node, attr) {
      journal._touch(node, attr.size === undefined ? Infinity : attr.size);
      return setattr.call(this, node, attr);
    };
    for (const name of ["mknod", "rename", "unlink", "rmdir", "symlink"]) {
      const op = dirOps[name];
      if (!op) continue;
      dirOps[name] = function (...args) {
        journal.treeChanged = true;
        return op.apply(this, args);
      };
    }
  }

  // node is about to change at byte offset `from` (Infinity: metadata only)
  _touch(node, from) {
    let entry = this.undo.get(node);
    if (!entry) {
      entry = {
        used: node.usedBytes,
        copy: null,
        mode: node.mode,
        atime: node.atime,
        mtime: node.mtime,
        ctime: node.ctime,
      };
      this.undo.set(node, entry);
    }
    if (!entry.copy && from < entry.used)
      entry.copy = node.contents.slice(0, entry.used);
  }

  mark() {
    this.undo.clear();
    if (this.treeChanged || !this.tree) {
      this.tree = walkFs(this.FS).map(([path, node]) => [
        path,
        node,
        node.parent,
        node.name,
      ]);
      this.treeChanged = false;
    }
    this.streams = [];
    this.FS.streams.forEach((stream, fd) => {
      if (stream) this.streams.push([fd, stream, stream.position]);
    });
    this.nextInode = this.FS.nextInode;
  }

  rollback() {
    const FS = this.FS;
    for (const [node, entry] of this.undo) {
      if (entry.copy) node.contents = entry.copy;
      node.usedBytes = entry.used;
      node.mode = entry.mode;
      node.atime = entry.atime;
      node.mtime = entry.mtime;
      node.ctime = entry.ctime;
    }
    this.undo.clear();
    if (this.treeChanged) {
      const want = new Map(this.tree.map((e) => [e[0], e]));
      const now = walkFs(FS);
      for (let i = now.length - 1; i >= 0; i--) {
        const [path, node] = now[i];
        if (want.get(path)?.[1] === node) continue;
        if (FS.isDir(node.mode)) FS.rmdir(path);
        else FS.unlink(path);
      }
      const have = new Map(walkFs(FS).map(([path, node]) => [path, node]));
      for (const [path, node, parent, name] of this.tree) {
        if (have.get(path) === node) continue;
        node.parent = parent;
        node.name = name;
        parent.contents[name] = node;
        FS.hashAddNode(node);
      }
      this.treeChanged = false;
    }
    const keep = new Set(this.streams.map(([fd]) => fd));
    FS.streams.forEach((stream, fd) => {
      if (stream && !keep.has(fd)) FS.streams[fd] = null;
    });
    for (const [fd, stream, position] of this.streams) {
      stream.fd = fd;
      stream.position = position;
      FS.streams[fd] = stream;
    }
    FS.nextInode = this.nextInode;
  }
}
