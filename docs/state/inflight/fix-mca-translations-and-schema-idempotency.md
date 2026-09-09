# fix/mca-translations-and-schema-idempotency — two things #140 left dirty

Both found by running `npm run build` on a clean Node 24 install and then
looking at `git status` — which is the check that was missing, not a new bug
class.

## 1. #140 added `<Trans>` strings and no translations

`admin+/mca-library.tsx` gained "Answer", "From counsel" and the counsel-findings
description. Lingui extracts on build, so every build since has been dirtying all
eleven `web.po` files. Every other MCA feature commit carried its extraction
(`b9b70a891`, `c68a4509a`, `d48da659d`); #140 did not. CI does not gate on it,
which is why it landed.

## 2. `schema.prisma` was committed `prisma format`-ed, but the build does not format

While landing the MCA finding model I ran `prisma format` on `schema.prisma` and
committed the result. The build runs `bizrethink:merge-additions` and nothing
else, so it regenerates the file with `additions.prisma`'s own alignment — and
every build has dirtied `schema.prisma` since.

Fixed by committing exactly what `merge-additions` produces, verified identical
byte-for-byte. `prisma validate` is still clean. The right long-term answer is
for `additions.prisma` and the merged schema to be formatted the same way, but
that is a wider change than this fix and would touch upstream-adjacent output.

## 3. `.node-version`

Node 26 (Homebrew default on the dev Mac) removed `fs.rmdir(path, {recursive:true})`,
which `zod-prisma-types@3.3.5` still calls, so `npm run build` could not run
locally at all. Node 24 still has it (DEP0147 warning only). 24 is also where
upstream already is and where our next sync lands, so it is the one target that
works before and after.

## State

Verified on a clean `npm ci` under Node 24.20.0 / npm 11.19.0: build exit 0
(5/5 tasks), remix typecheck clean, 1880 MCA tests green, and `git status` clean
afterwards — which is the point.
