import { normalisedDigest } from './source-text';
import { type SidecarEntry, type WatchedSource, watchedSources } from './source-watch';

/**
 * The monthly check itself — ADR 0025 §3.
 *
 * It compares each **official source** with the stored copy, which is the thing
 * the existing provenance checkers cannot do: those verify that our copy still
 * matches itself. It **reports** a difference and never resolves one, because a
 * statute that moved is a reading task and not a merge.
 *
 * FAILING TO FETCH IS A RESULT, NOT A SKIP. ADR 0025 §3 asks it to fail loudly
 * when a source cannot be fetched, "because a check that silently stops running
 * is worse than no check". A source that 404s is reported as `unreachable` and
 * makes the run fail — a legislature reorganising its site is exactly the event
 * this is for, and it is also how our links rotted last time.
 *
 * The fetcher is injected so the rule can be tested without a network, and so
 * the job can be run against a recorded fixture if anyone ever needs to.
 */

export type SourceCheck =
  | { file: string; state: 'unchanged'; from: string }
  | { file: string; state: 'differs'; from: string; why: string }
  | { file: string; state: 'unreachable'; from: string; why: string }
  | {
      file: string;
      state: 'manual';
      publisher: string | null;
      site: string | null;
      /** Past the threshold, or never recorded at all. */
      overdue: boolean;
      why: string;
    };

export type SourceCheckReport = {
  checkedAt: string;
  results: SourceCheck[];
  /** True when anything needs a person: a difference, a fetch failure, or an overdue manual source. */
  needsAttention: boolean;
};

export type Fetcher = (url: string) => Promise<string>;

const manualReason = (entry: Extract<WatchedSource, { kind: 'manual' }>): string => {
  if (entry.recordedOn === null) {
    return 'Never recorded. Nobody has confirmed this copy against its source since it was vendored.';
  }

  return entry.overdue
    ? `Last confirmed ${entry.recordedOn}, ${entry.daysSinceRecorded} days ago.`
    : `Last confirmed ${entry.recordedOn}.`;
};

/**
 * THE PAGE NOW AGAINST THE PAGE WHEN A PERSON LAST CONFIRMED IT.
 *
 * Not against our stored copy: ours is extracted text carrying a header we
 * wrote, theirs is HTML. Those never match, so that comparison reports a
 * difference for all three fetchable sources on the first run and every run
 * after — which is precisely how a check stops being read. Found by running it.
 *
 * Normalised first, so a publisher reflowing its own template is not reported
 * as the law changing.
 */
const digestOf = (text: string) => normalisedDigest(text);

export const checkSources = async (
  files: { file: string; text: string }[],
  sidecar: Record<string, SidecarEntry>,
  fetch: Fetcher,
  now: Date,
): Promise<SourceCheckReport> => {
  const results: SourceCheck[] = [];

  for (const entry of watchedSources(files, sidecar, now)) {
    if (entry.kind === 'manual') {
      results.push({
        file: entry.file,
        state: 'manual',
        publisher: entry.publisher,
        site: entry.site,
        overdue: entry.overdue,
        why: manualReason(entry),
      });

      continue;
    }

    /*
      EVERY page of the source, and all of them every run. Stopping at the first
      difference would report one amended section and leave the rest of a
      six-section statute unread until somebody dealt with that one, so the
      report names them all at once.
    */
    const moved: string[] = [];
    const unreachable: string[] = [];

    for (const page of entry.pages) {
      try {
        const live = await fetch(page.url);

        if (digestOf(live) !== page.digest) {
          moved.push(page.url);
        }
      } catch (cause) {
        unreachable.push(`${page.url} (${cause instanceof Error ? cause.message : 'could not be fetched'})`);
      }
    }

    const from = entry.pages.map((page) => page.url).join(', ');

    /*
      "We could not look" outranks "it changed". A difference found across a
      partial read is a weaker finding than it looks, and reporting the stronger
      state would claim more than the run established.
    */
    if (unreachable.length > 0) {
      results.push({ file: entry.file, state: 'unreachable', from, why: `Could not fetch: ${unreachable.join('; ')}` });

      continue;
    }

    results.push(
      moved.length === 0
        ? { file: entry.file, state: 'unchanged', from }
        : {
            file: entry.file,
            state: 'differs',
            from,
            why:
              `The published page has changed since it was last confirmed: ${moved.join(', ')}. ` +
              'Read it; do not merge it.',
          },
    );
  }

  return {
    checkedAt: now.toISOString().slice(0, 10),
    results,
    /*
      A run needs a person when the law may have moved (`differs`), when we
      could not look (`unreachable`), or when a source nobody can check
      automatically has gone too long unconfirmed. A manual source checked
      recently is not a problem — reporting it as one would make the whole
      report noise, which is how a check stops being read.
    */
    needsAttention: results.some(
      (result) =>
        result.state === 'differs' || result.state === 'unreachable' || (result.state === 'manual' && result.overdue),
    ),
  };
};
