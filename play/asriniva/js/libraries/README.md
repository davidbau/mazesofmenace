# Independent libraries

`compress/unix-z.js`, `regex/posix.js` and `terminfo/` implement independent library
formats and behavior. Their NetHack/C ABI adapters belong with their callers or
in `../c-runtime`; platform defaults belong in `../platform`.
