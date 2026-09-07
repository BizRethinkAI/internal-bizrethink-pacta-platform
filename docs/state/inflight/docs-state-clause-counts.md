# docs/state-clause-counts — correct numbers that had drifted

**PR:** #TBD. Docs only.

## What was wrong

`STATE.md` said **52 clauses**, in two places, and **27 Florida** in a third.

Measured against `FL_LIBRARY` today: **64 clauses** — 35 generic, 1 federal,
**28** Florida; 58 `attorney-drafted, author: null` and 6 transcribed statute.
The interview is **15 steps / 70 fields**, not 13 / 68.

## Where 52 came from, which is the part worth keeping

**52 is the number of clauses that RENDER for the Picana matter** — one
property, one set of answers. It was copied into three places as though it were
the size of the library.

A count that depends on a matter is not a fact about the library. The two were
equal once and drifted the moment a clause was added that Picana does not
select. Recorded in the file so the next person who sees a clause count knows to
ask *"of what?"*.

## Verified, not remembered

Counts derived from `FL_LIBRARY` and `FL_INTERVIEW` directly. Approval and
review counts from a read-only production query: **0 approvals, 0 library
reviews**, which is why the entry now says plainly that nothing in the library
is reviewed rather than leaving it implied.
