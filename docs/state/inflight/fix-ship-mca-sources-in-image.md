# fix/ship-mca-sources-in-image — the statutes were not in the image

**Branch:** `fix/ship-mca-sources-in-image`. Overlay 069.

## What was wrong

`packages/bizrethink/mca/sources/` holds the primary text every MCA disclosure
spec was transcribed from — 764K across fourteen files. `verifyProvenance`
re-reads and re-hashes them on every run, which is the whole mechanism: a
`verbatimVerifiedAt` date asserts *"these bytes have not moved since we
checked"*, and without the bytes it asserts nothing.

`docker/Dockerfile`'s runner stage copies the built app, the prisma schema and
the migrations. Not the sources.

So `/admin/mca` — the phase-2 surface — would have reported **SOURCE MISSING /
Not verified for all eleven states in production**, while rendering correctly on
every developer machine and in every test.

## Why it is worth a note

The page would have been telling the truth about a gap it had itself created,
and the failure only appears in the one environment nobody runs the suite in.
The phase-2 agent found it while checking its own work, made it degrade honestly
rather than crash — `__dirname` is *undeclared* in an ESM bundle, so the
original top-level `join(__dirname, …)` would have thrown at module load and
taken the server down — and handed the Dockerfile back as outside its scope.

That is the right split, and it is why this is a separate change: the surface is
correct, the image was not.

## The change

One `COPY` in the runner stage, anchored after the prisma migrations copy.
Deliberately not copied into the build stages: nothing compiles these files,
they are read at request time.

Recorded as overlay 069 because `docker/Dockerfile` is upstream — the same
reason overlays 003 (heap size) and 031 (healthcheck) exist against it.

## What this does not fix

Whether the digests still match in production is now *answerable*, not
answered. If a vendored statute is amended, the page will say so — which is the
point, and is a different thing from saying the states are verified.
