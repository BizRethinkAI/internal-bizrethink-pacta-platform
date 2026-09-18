#!/usr/bin/env node
/**
 * The monthly source check — ADR 0025 §3.
 *
 * Compares each OFFICIAL SOURCE with our stored copy and raises the difference
 * for a person to read. The existing provenance checkers verify that a stored
 * copy still matches itself, which catches our drift from the copy and never
 * the copy's drift from the law. For a vertical whose stated primary
 * responsibility is keeping the library current, the ADR calls that "a hole in
 * the middle of the purpose".
 *
 * IT REPORTS, IT NEVER RESOLVES. A statute that moved is a reading task, not a
 * merge, so nothing here writes to `mca/sources/`.
 *
 * Exit codes: 0 nothing needs a person, 1 something does. A failure to fetch
 * counts — "a check that silently stops running is worse than no check".
 *
 * Run by `.github/workflows/mca-source-check.yml` on the first of each month,
 * and by hand with `npx tsx scripts/mca/check-sources.ts`.
 *
 * TYPESCRIPT, RUN THROUGH `tsx`, because it imports the rule from the package
 * where the rule is tested. Node's own type stripping cannot resolve the
 * extensionless relative imports the package uses throughout, and duplicating
 * the comparison logic into a plain script would mean the thing that runs
 * monthly is not the thing the tests cover.
 */
import { appendFileSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkSources } from '../../packages/bizrethink/mca/provenance/source-check';

const SOURCES = resolve(dirname(fileURLToPath(import.meta.url)), '../../packages/bizrethink/mca/sources');

/** A real fetch, with a timeout so an unresponsive host fails rather than hangs the job. */
const fetchSource = async (url: string): Promise<string> => {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(30_000),
    headers: { 'user-agent': 'pacta-mca-source-check (compliance source verification)' },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.text();
};

/** Wrapped rather than top-level: `tsx` emits CommonJS, which has no top-level await. */
const main = async (): Promise<void> => {
  /*
    EVERY SOURCE, not only the text ones. `VA-Disclosure-Form.pdf` is a
    prescribed form and needs watching as much as any statute — an earlier
    version of this filtered on `.txt` and skipped it in silence, which is the
    exact failure ADR 0025 §3 is about. A file whose header cannot be read
    still appears, as one nobody can check automatically.
  */
  const files = readdirSync(SOURCES)
    .filter((file) => file !== 'README.md' && file !== 'provenance.json')
    .map((file) => ({ file, text: readFileSync(join(SOURCES, file), 'latin1') }));

  /*
    A SIDECAR, because the vendored files are evidence: their digests are
    pinned so a verification date is bound to the exact bytes verified, and
    writing our own metadata into them would break that binding.
  */
  const sidecar = JSON.parse(readFileSync(join(SOURCES, 'provenance.json'), 'utf8'));

  const report = await checkSources(files, sidecar, fetchSource, new Date());

  const automatic = report.results.filter((result) => result.state !== 'manual');
  const manual = report.results.filter((result) => result.state === 'manual');

  const lines = [`MCA source check — ${report.checkedAt}`, ''];

  lines.push(`AUTOMATIC (${automatic.length}) — fetched and compared`);

  for (const result of automatic) {
    const mark = result.state === 'unchanged' ? '  ok  ' : result.state === 'differs' ? ' DIFF ' : ' FAIL ';

    lines.push(`${mark} ${result.file}`);

    if (result.state !== 'unchanged') {
      lines.push(`        ${result.why}`);
      lines.push(`        ${result.from}`);
    }
  }

  lines.push(
    '',
    `NEEDS A PERSON (${manual.length}) — no retrieval URL, or no confirmed baseline to compare a fetch against`,
  );

  for (const result of manual) {
    lines.push(`${result.overdue ? ' DUE  ' : '  ok  '} ${result.file}`);
    lines.push(`        ${result.why}`);
    lines.push(`        ${result.publisher ?? 'Publisher not recorded'}${result.site ? ` — ${result.site}` : ''}`);
  }

  lines.push(
    '',
    report.needsAttention
      ? 'Something needs a person: read the differences, chase what could not be fetched, and confirm what is overdue.'
      : 'Nothing needs a person this month.',
    '',
    'To move a source into the automatic column: read its published page, confirm it is the statute we stored,',
    'and record both `retrievedFrom` and `sourceDigest` for it in mca/sources/provenance.json. The baseline is a',
    'person saying "I read this" — taking it automatically would bless a change nobody had seen.',
  );

  const text = lines.join('\n');

  console.log(text);

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\`\`\`\n${text}\n\`\`\`\n`);
  }

  process.exit(report.needsAttention ? 1 : 0);
};

void main();
