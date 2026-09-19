#!/usr/bin/env node
/**
 * The machine half of setting a source baseline — ADR 0025 §3.
 *
 * Three steps, and the ORDER IS ENFORCED rather than documented:
 *
 *     npx tsx scripts/mca/source-baseline.ts collect TX-Fin-Code-Ch-398.txt
 *     …a person (helped by a model) answers WHERE AN AMENDMENT WOULD APPEAR,
 *       and signs that answer…
 *     npx tsx scripts/mca/source-baseline.ts fetch  output/mca-baseline/<file>.json
 *     …a person reads the page against our stored copy, with the screenshot,
 *       and signs that reading…
 *     npx tsx scripts/mca/source-baseline.ts apply  output/mca-baseline/<file>.json
 *
 * `fetch` refuses to run before the first signature and `apply` refuses before
 * both, so the ordering is a property of the tool rather than of whoever is
 * using it. Nothing here signs anything: this script fetches, extracts,
 * digests and diffs, and every one of those is a machine's job. The assertion
 * "this is the statute we stored" is not, because a machine making it would
 * hash the page against itself and bless a change nobody had seen.
 *
 * WHY STEP ONE EXISTS AT ALL. "Where the text came from" is not "where an
 * amendment would appear". `TX-Fin-Code-Ch-398.txt` is the enrolled HB 700 of
 * 2025 — a finished document that will read the same in 2030 — while an
 * amendment to Chapter 398 lands in the codified chapter at a different URL.
 * Roughly eleven of the twenty-six recorded pages are frozen like that, so
 * without this step the baselining pass would have produced a watch that
 * reports `unchanged` forever and can never fire.
 *
 * Packages are written under `output/`, which is gitignored: they carry fetched
 * third-party text and screenshots, and they are working evidence rather than
 * something to commit. Only the digests reach `provenance.json`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  type BaselinePackage,
  PAGE_IDENTIFICATION_ATTESTATION,
  READING_ATTESTATION,
  readyToApply,
} from '../../packages/bizrethink/mca/provenance/baseline-package';
import { normalisedDigest } from '../../packages/bizrethink/mca/provenance/source-text';
import { fetchPage } from './fetch-page';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCES = join(ROOT, 'packages/bizrethink/mca/sources');
const OUT = join(ROOT, 'output/mca-baseline');

const sidecar = (): Record<string, { pages?: { url: string; digest: string | null }[]; note?: string }> =>
  JSON.parse(readFileSync(join(SOURCES, 'provenance.json'), 'utf8'));

const packagePath = (file: string) => join(OUT, `${file}.json`);

const readPackage = (path: string): BaselinePackage => JSON.parse(readFileSync(path, 'utf8'));

const writePackage = (path: string, pkg: BaselinePackage) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
};

const die = (message: string): never => {
  console.error(message);
  process.exit(1);
};

/**
 * Step one. Lay out what the sidecar already claims and leave the question
 * open.
 *
 * `amendmentAppearsAt` is deliberately null: this script cannot answer it, and
 * pre-filling it with the recorded URL is exactly the mistake that produced
 * eleven frozen pages.
 */
const collect = (file: string) => {
  const entry = sidecar()[file];

  if (!entry) {
    die(`${file} is not in provenance.json`);
  }

  if (!existsSync(join(SOURCES, file))) {
    die(`${file} is not in mca/sources/`);
  }

  const stored = readFileSync(join(SOURCES, file), 'latin1');

  const pkg: BaselinePackage = {
    file,
    mode: 'baseline',
    generatedAt: new Date().toISOString(),
    pageIdentification: {
      recordedPages: (entry.pages ?? []).map((page) => ({
        url: page.url,
        provenance: entry.note ?? 'No provenance recorded.',
      })),
      amendmentAppearsAt: null,
      reasoning: null,
      signOff: null,
    },
    baseline: { pages: [], visionCorroboration: null, signOff: null },
  };

  const path = packagePath(file);

  writePackage(path, pkg);

  console.log(`Package:      ${path}`);
  console.log(`Stored copy:  ${stored.length} characters, digest ${normalisedDigest(stored).slice(0, 16)}…`);
  console.log(`Recorded:     ${pkg.pageIdentification.recordedPages.map((page) => page.url).join('\n              ')}`);
  console.log('');
  console.log('STEP 1 — where would an amendment to this source appear?');
  console.log('  A recorded URL is where the text CAME FROM, which is not the same question. An');
  console.log('  enrolled bill, an archived register issue and a dated snapshot are all finished');
  console.log('  documents: watching one reports `unchanged` forever and can never fire.');
  console.log('');
  console.log('  Fill `amendmentAppearsAt` and `reasoning`, then sign `pageIdentification.signOff`:');
  console.log(`    confirms: "${PAGE_IDENTIFICATION_ATTESTATION}"`);
  console.log('');
  console.log(`  Then: npx tsx scripts/mca/source-baseline.ts fetch ${path}`);
};

/**
 * Step two. Fetch exactly the pages step one identified — never the recorded
 * ones, and never a guess.
 */
const fetchStep = async (path: string) => {
  const pkg = readPackage(path);
  const { amendmentAppearsAt, signOff } = pkg.pageIdentification;

  if (signOff === null || signOff.confirms !== PAGE_IDENTIFICATION_ATTESTATION) {
    die(
      'Refusing to fetch: nobody has signed which page an amendment would appear on.\n' +
        `Fill amendmentAppearsAt, then sign pageIdentification.signOff with exactly:\n  "${PAGE_IDENTIFICATION_ATTESTATION}"`,
    );
  }

  if (amendmentAppearsAt === null || amendmentAppearsAt.length === 0) {
    die('Refusing to fetch: amendmentAppearsAt is empty, so there is nothing identified to watch.');
  }

  const stored = readFileSync(join(SOURCES, pkg.file), 'latin1');

  pkg.baseline.pages = [];

  for (const url of amendmentAppearsAt) {
    process.stdout.write(`  fetching ${url} … `);

    try {
      const page = await fetchPage(url);
      const digest = normalisedDigest(page.text);
      const textPath = join(OUT, `${pkg.file}.${pkg.baseline.pages.length}.extracted.txt`);

      writeFileSync(textPath, page.text);

      pkg.baseline.pages.push({
        url: page.url,
        finalUrl: page.finalUrl,
        httpStatus: page.httpStatus,
        contentType: page.contentType,
        extractedChars: page.text.length,
        extractedDigest: digest,
        screenshot: null,
      });

      console.log(`${page.text.length} chars, ${digest.slice(0, 16)}…`);
      console.log(`      extracted → ${textPath}`);
    } catch (cause) {
      console.log('FAILED');
      die(`  ${cause instanceof Error ? cause.message : String(cause)}`);
    }
  }

  writePackage(path, pkg);

  console.log('');
  console.log(`Stored copy:  ${stored.length} characters, for the reading comparison.`);
  console.log('');
  console.log('STEP 2 — read the page against our stored copy.');
  console.log('  The text diff is the verdict. A screenshot and a vision reading corroborate it and');
  console.log('  are the evidence of what the page looked like; record them on each page and in');
  console.log('  `visionCorroboration`. Vision disagreeing with the text is itself a finding.');
  console.log('');
  console.log(`  Then sign baseline.signOff with exactly:\n    confirms: "${READING_ATTESTATION}"`);
  console.log(`  Then: npx tsx scripts/mca/source-baseline.ts apply ${path}`);
};

/** Step three. The gate, and the only thing that writes a digest. */
const apply = (path: string) => {
  const pkg = readPackage(path);
  const verdict = readyToApply(pkg);

  if (!verdict.ok) {
    console.error('Refusing to record a baseline. Blocked by:');

    for (const reason of verdict.blocked) {
      console.error(`  ${reason}`);
    }

    console.error('');
    console.error('A reason you have looked at and accepted goes in baseline.signOff.acknowledged,');
    console.error('beside your signature, rather than being removed from the package.');
    process.exit(1);
  }

  const path_ = join(SOURCES, 'provenance.json');
  const all = JSON.parse(readFileSync(path_, 'utf8'));

  all[pkg.file] = { ...all[pkg.file], pages: verdict.pages.map(({ url, digest }) => ({ url, digest })) };
  writeFileSync(path_, `${JSON.stringify(all, null, 2)}\n`);

  console.log(`Recorded ${verdict.pages.length} baseline(s) for ${pkg.file}:`);

  for (const { url, digest } of verdict.pages) {
    console.log(`  ${digest.slice(0, 16)}…  ${url}`);
  }

  console.log('');
  console.log('provenance.json updated. Commit it with the package’s reasoning in the message.');
};

const main = async () => {
  const [command, argument] = process.argv.slice(2);

  if (command === 'collect' && argument) {
    collect(argument);
  } else if (command === 'fetch' && argument) {
    await fetchStep(argument);
  } else if (command === 'apply' && argument) {
    apply(argument);
  } else {
    die('usage: source-baseline.ts collect <source-file> | fetch <package.json> | apply <package.json>');
  }
};

void main();
