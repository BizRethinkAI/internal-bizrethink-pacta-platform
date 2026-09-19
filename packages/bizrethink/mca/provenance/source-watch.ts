import { sourceProvenance } from './source-provenance';

/**
 * Which stored sources the monthly job can check by itself, and which need a
 * person — ADR 0025 §3.
 *
 * The ADR asks for a job that "compares each official source against the stored
 * copy and raises the difference for a human to read". Most of our copies
 * cannot be fetched: the deep links were never recorded and have since rotted,
 * as several of the headers say in words. Pretending otherwise would produce a
 * check that fails every month for twenty sources and is therefore ignored,
 * which is the "silently stops running" failure the ADR names.
 *
 * So this splits them honestly. A source with a recorded URL is **automatic**:
 * the job fetches it and reports a difference. A source without one is
 * **manual**: the job reports how long it has been since a person last looked,
 * and where to look. Recording a URL on a source moves it from one column to
 * the other with no change here.
 *
 * IT REPORTS; IT NEVER RESOLVES. A statute that moved is a reading task, not a
 * merge.
 */

/** How long a manual source may go unchecked before the report calls it overdue. */
export const MANUAL_CHECK_DUE_AFTER_DAYS = 180;

/**
 * One published page a source was taken from, and what it hashed to when a
 * person last confirmed it.
 *
 * A LIST, BECAUSE THE SOURCES ARE NOT ONE PAGE. `retrievedFrom` was a single
 * URL. Counting the deep links in the stored files' own headers:
 * `FL-Stat-559.961-9615.txt` consolidates six statute sections, and
 * `CT-CGS-36a-861-872.txt`, `UT-Title-7-Ch-27.txt` and both Virginia form
 * extractions cite two each — only seven of nineteen are cleanly one page.
 * Connecticut's README says so outright: "the combined file is our
 * consolidation, not a document fetched from a single official URL."
 */
export type WatchedPage = { url: string; digest: string };

export type WatchedSource = {
  /** The file under `mca/sources/`. */
  file: string;
  publisher: string | null;
  site: string | null;
} & (
  | { kind: 'automatic'; pages: WatchedPage[]; recordedOn: string | null }
  | { kind: 'manual'; recordedOn: string | null; daysSinceRecorded: number | null; overdue: boolean }
);

const DAY = 24 * 60 * 60 * 1000;

const daysBetween = (from: string, to: Date): number =>
  Math.floor((to.getTime() - new Date(`${from}T00:00:00Z`).getTime()) / DAY);

/**
 * Classify one stored source.
 *
 * `now` is passed in rather than read, so the report is a pure function of its
 * inputs and a test can state a date instead of arranging for one.
 */
/**
 * What the sidecar records for one file.
 *
 * `sources/provenance.json` holds what the vendored files cannot: a retrieval
 * URL, a confirmed baseline, and a publisher for the sources whose own headers
 * never named one. It is a sidecar because the files are EVIDENCE — their
 * digests are pinned so a verification date is bound to the exact bytes that
 * were verified, and writing our metadata into them would break that binding.
 */
export type SidecarEntry = {
  publisher?: string | null;
  site?: string | null;
  retrievedFrom?: string | null;
  recordedOn?: string | null;
  sourceDigest?: string | null;
  /**
   * The pages a consolidated source was assembled from, each with its own
   * baseline. `digest: null` is a page nobody has confirmed yet.
   */
  pages?: { url: string; digest: string | null }[] | null;
};

export const watchedSource = (
  file: string,
  text: string,
  sidecar: Record<string, SidecarEntry>,
  now: Date,
): WatchedSource => {
  const inFile = sourceProvenance(text);
  const extra = sidecar[file] ?? {};

  /*
    The file's own header wins where it has one: it sits inside the bytes a
    person verified, so it is the stronger claim. The sidecar fills the gaps.
  */
  const publisher = inFile.publisher ?? extra.publisher ?? null;
  const site = inFile.site ?? extra.site ?? null;
  const retrievedFrom = inFile.retrievedFrom ?? extra.retrievedFrom ?? null;
  const recordedOn = inFile.recordedOn ?? extra.recordedOn ?? null;
  const sourceDigest = inFile.sourceDigest ?? extra.sourceDigest ?? null;

  /*
    The file's own single `Retrieved:`/`SourceDigest:` header is one page; the
    sidecar's `pages` is the general form. The header wins where it has one,
    for the same reason it wins above — it sits inside the bytes a person
    verified.
  */
  const declared: { url: string; digest: string | null }[] =
    retrievedFrom !== null ? [{ url: retrievedFrom, digest: sourceDigest }] : (extra.pages ?? []);

  /*
    A URL alone is not enough to check a source automatically — there has to be
    a baseline to compare the page against. Recording one is a person's job: it
    asserts "I read this page and it is the statute we stored", and a baseline
    taken by a machine would silently bless a change nobody had seen.

    EVERY page, and at least one. Checking the five sections someone got to
    while ignoring the sixth would report `unchanged` for a statute with an
    unwatched part — the check blessing its own blind spot, which is precisely
    what requiring a human baseline exists to prevent.
  */
  if (declared.length > 0 && declared.every((page) => page.digest !== null)) {
    return {
      file,
      publisher,
      site,
      kind: 'automatic',
      pages: declared as WatchedPage[],
      recordedOn,
    };
  }

  const daysSinceRecorded = recordedOn === null ? null : daysBetween(recordedOn, now);

  return {
    file,
    publisher,
    site,
    kind: 'manual',
    recordedOn,
    daysSinceRecorded,
    /*
      NEVER CHECKED COUNTS AS OVERDUE. A source with no date is not a source in
      good standing — it is one nobody has confirmed since it was vendored, and
      reporting it as fine because there is nothing to compare against would be
      the check congratulating itself on its own blind spot.
    */
    overdue: daysSinceRecorded === null || daysSinceRecorded >= MANUAL_CHECK_DUE_AFTER_DAYS,
  };
};

/** Sorted so the report reads the same way twice and a diff of two runs is meaningful. */
export const watchedSources = (
  files: { file: string; text: string }[],
  sidecar: Record<string, SidecarEntry>,
  now: Date,
): WatchedSource[] =>
  files
    .map(({ file, text }) => watchedSource(file, text, sidecar, now))
    .sort((left, right) => left.file.localeCompare(right.file));
