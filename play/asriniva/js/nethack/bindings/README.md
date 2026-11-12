# NetHack translation bindings

Each module supplies the declarations, dependency names and source-specific
transport needed by the corresponding source-shaped `../../ported` module.
Both the standalone and Emscripten providers use these bindings. Generic stack,
conversion, environment, memory, record, array and global machinery belongs in
`../../c-runtime`; header and union aliases belong in `../header-aliases.js`.

A binding is still necessary when C source is translated to JavaScript: it gives
C-shaped code its measured globals, record fields and imported functions. These
files are module declarations and policies, rather than separate C emulators.
Some source-specific conversions and storage initialization remain local.
