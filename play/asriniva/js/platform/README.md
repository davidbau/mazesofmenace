# Configured platform behavior

`darwin/` preserves the configured Darwin compatibility, terminal, qsort,
calendar and strftime profiles. `timezone/` owns timezone lookup and its data.
These are JavaScript implementations; the platform name describes the behavior
they reproduce. Generic C machinery lives in `../c-runtime`.
