# docs/picana-moved-to-personal-org — record a production data move

**PR:** #TBD. Docs and one-off SQL only; the data change is already applied.

## What happened

29090 Picana Ln is a personal rental. Its lease names four natural persons and
the company appears nowhere in the agreement — it was simply created in the
wrong organisation. Moved 2026-09-06 from `org_wzsyehzolibvnxal` (BizRethink AI)
to `org_nkzrmhochvhmbwnt` (`/o/personal`), team `prabhat`.

Verified after: property, matter and 15 documents on the destination, matter
`teamId` = 3, the draft-rendering grant transferred, reviews 5 and comments 3
untouched, zero orphans on three independent checks, and the source
organisation holding nothing. Confirmed in the app — the 26-page preview
renders at `/t/prabhat/…`, which is what proves the grant moved.

## The two things nearly missed

My first proposal moved the property and the matter's `organisationId`. An
adversarial review found that insufficient, and both misses are worth keeping:

**`BizrethinkDocument` carries its own `organisationId`**, and
`documents.list/update/remove` authorize on that column alone without checking
the property belongs to the caller. The 15 HOA documents would have stayed the
company's — and invisibly, since a member of both organisations sees no
difference.

**`BizrethinkLeaseMatter.teamId`** is passed straight into `createEnvelope` by
`matter.send`. Moving only the organisation would have left the matter pointing
at a team in the company, and the signed envelope for a personal lease would
have been created back inside BizRethink AI.

I had also flagged the wrong lock: `lease-builder` is granted to a USER and
never breaks; the org-scoped one is `lease-clause-draft-rendering`, whose
absence makes the lease silently unsendable rather than invisible.

## Why the grant moved rather than being copied

After the move the company holds no lease work. Migration `20260829100000`
exists because its predecessor flag drifted onto seven organisations, each
silently permitted to render un-lawyered legal text; its closing line is "lock 2
now fails closed for anyone new". Leaving it granted would recreate that.

## The constraint worth remembering

This was cheap **only** because nothing had been signed — `envelopeId` was NULL
and the organisation had zero envelopes. **There is no code path to move an
envelope between teams.** Any similar correction has to happen before the first
send, or not at all.

## Also in this PR

- The `20260829100000` migration comment named the company as "the single
  organisation that actually holds lease-builder work". Annotated rather than
  edited: an applied migration records what ran, not what is true now.
- The one-off SQL said 6 reviews; it is 5. Corrected in both files, and the
  applied one is marked APPLIED so nobody takes it for a to-do.
