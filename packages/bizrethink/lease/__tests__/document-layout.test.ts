import { extractPlaceholdersFromPDF } from '@documenso/lib/server-only/pdf/auto-place-fields';
import { FieldType } from '@prisma/client';
import { beforeAll, describe, expect, it } from 'vitest';

import { FL_SECTION_NAMES } from '../clauses/us-fl';
import { PICANA_FACTS, PICANA_MONEY, PICANA_PARTIES, PICANA_VALUES } from '../matters/picana-ln';
import { initialledPaddingBottom } from '../render/lease-document';
import type { RenderLeaseResult } from '../render/render-lease';
import { buildLeaseDocuments, renderLease } from '../render/render-lease';
import { PILOT_PACKAGE, pageLines, squash } from './page-text';

/**
 * What a full page-by-page read of the pilot lease package found in the
 * renderer on 2026-09-15 — seven documents, twenty-nine pages — that no test
 * reading clause text could see.
 *
 * Asserted on the rendered pages of BOTH the checked-in Picana matter and the
 * anonymised pilot package, because the pilot is where two of these showed and
 * Picana is where they did not.
 */

const PICANA = {
  facts: PICANA_FACTS,
  money: PICANA_MONEY,
  values: PICANA_VALUES,
  parties: PICANA_PARTIES,
  propertyAddress: '29090 Picana Lane, Wesley Chapel, Florida 33543',
};

const FIXTURES = { picana: PICANA, pilot: PILOT_PACKAGE } as const;

type Rendered = { result: RenderLeaseResult; pages: Record<string, string[][]> };

const rendered: Record<string, Rendered> = {};

beforeAll(async () => {
  for (const [name, input] of Object.entries(FIXTURES)) {
    const result = await renderLease(input);
    const pages: Record<string, string[][]> = {};

    for (const doc of result.rendered) {
      pages[doc.key] = await pageLines(doc.pdf);
    }

    rendered[name] = { result, pages };
  }
}, 180_000);

const NOUN = { lease: 'Lease', addendum: 'Addendum', disclosure: 'Disclosure' } as const;

describe.each(Object.keys(FIXTURES))('the %s package', (name) => {
  /*
    "IN WITNESS WHEREOF, the parties have executed this Lease as of the date
    first written above" — on every document, including the addenda and the
    flood disclosure, and above no written date at all. Clause 1 defers the
    effective date to the Execution clause, and 13.5 makes it the date of the
    last signature: the dates are the ones written beside the signatures.
  */
  it('says what each document is, and where its dates are, at the execution block', () => {
    const { result, pages } = rendered[name];

    for (const doc of result.documents) {
      const body = pages[doc.key]
        .flat()
        .join(' ')
        .replace(/-\s(?=[a-z])/g, '');

      expect(body, doc.key).not.toContain('date first written above');
      expect(body, doc.key).toContain(
        `IN WITNESS WHEREOF, the parties have signed this ${NOUN[doc.kind]} on the dates shown below their signatures.`,
      );
    }
  });

  /*
    A section whose FIRST clause was longer than the binding threshold lost its
    head entirely: both arms of a conditional returned `[headingRow, body]`. In
    the pilot, 9.2 ran straight into 10.1 with no "10 DEFAULT AND REMEDIES".
  */
  it('prints every section head the contents lists', () => {
    const { result, pages } = rendered[name];
    const lease = result.documents.find((doc) => doc.kind === 'lease');
    const leasePages = pages.lease;

    const contentsAt = leasePages.findIndex((page) => page.some((line) => squash(line) === 'Contents'));
    const sectionNumbers = new Set((lease?.clauses ?? []).map((clause) => (clause.number ?? '').split('.')[0]));

    const missing = [...sectionNumbers].filter((number) => {
      const clause = lease?.clauses.find((c) => (c.number ?? '').split('.')[0] === number);
      const head = squash(
        `${number} ${FL_SECTION_NAMES[clause?.clause.section as keyof typeof FL_SECTION_NAMES] ?? ''}`.toUpperCase(),
      );

      return !leasePages.slice(contentsAt + 1).some((page) => page.some((line) => squash(line) === head));
    });

    expect(contentsAt).toBeGreaterThan(-1);
    expect(missing, 'section heads missing from the body').toEqual([]);
  });

  /*
    "PACTA · ADDENDUM:HOA.GOVERNING-DOCUMENTS-RECEIPT" — the internal document
    key, on every page a tenant signs.
  */
  it('names the document in its footer, not its internal key', () => {
    const { result, pages } = rendered[name];

    for (const doc of result.documents) {
      for (const [at, page] of pages[doc.key].entries()) {
        const text = page.join('\n');

        // `lease` is also a word in "RESIDENTIAL LEASE"; the keys that leaked are the namespaced ones.
        if (doc.key.includes(':')) {
          expect(text, `${doc.key} p${at + 1}`).not.toContain(doc.key.toUpperCase());
        }
        expect(text, `${doc.key} p${at + 1}`).not.toMatch(/PACTA ·/);
        // Whitespace-insensitive: the foot is tracked, and pdfjs splits words at kerning ("Deliver y").
        expect(squash(text), `${doc.key} p${at + 1}`).toContain(
          squash(`${doc.title} PAGE ${at + 1} OF ${pages[doc.key].length}`),
        );
      }
    }
  });

  /*
    An addendum or disclosure is one clause, so its "section" is a clause-library
    category — "RULES AND ASSOCIATION" over the governing-documents receipt,
    "STATUTORY DISCLOSURES" over the flood disclosure — printed as a head,
    indented by an empty number column. The document title is its head.
  */
  it('prints no library category as a heading on an addendum or disclosure', () => {
    const { result, pages } = rendered[name];
    const categories = new Set(Object.values(FL_SECTION_NAMES).map((label) => squash(label.toUpperCase())));

    for (const doc of result.documents.filter((d) => d.kind !== 'lease')) {
      const headed = pages[doc.key].flat().filter((line) => categories.has(squash(line)));

      expect(headed, doc.key).toEqual([]);
    }
  });

  /*
    Initials sat under "Date:" on the signature page — one per signer, on the one
    page that already carries their signature — so they acknowledged nothing.
    Initialling exists to make a swapped page detectable; that needs a field on
    EVERY page, which is how the Florida Supreme Court form lease (SC09-250,
    Appendix B) sets them: in the page foot.
  */
  it("puts every signer's initials on every page of every addendum, and nowhere else", async () => {
    const { result } = rendered[name];
    const recipients = result.documents[0] ? FIXTURES[name as keyof typeof FIXTURES].parties.length : 0;

    for (const doc of result.rendered) {
      const spec = result.documents.find((d) => d.key === doc.key);
      const pageCount = rendered[name].pages[doc.key].length;
      const initials = (await extractPlaceholdersFromPDF(doc.pdf)).filter(
        (p) => p.fieldAndMeta.type === FieldType.INITIALS,
      );

      if (!spec?.withInitials) {
        expect(initials, doc.key).toEqual([]);
        continue;
      }

      for (let page = 1; page <= pageCount; page += 1) {
        const onPage = initials.filter((p) => p.page === page).map((p) => p.recipient.toLowerCase());

        expect(onPage.sort(), `${doc.key} p${page}`).toEqual(
          Array.from({ length: recipients }, (_, i) => `r${i + 1}`).sort(),
        );
      }

      // Big enough to initial, and inside the page foot rather than the body.
      for (const field of initials) {
        expect(field.width, `${doc.key} p${field.page}`).toBeGreaterThanOrEqual(30);
        expect(field.height, `${doc.key} p${field.page}`).toBeGreaterThanOrEqual(8);
        expect(field.y, `${doc.key} p${field.page}`).toBeGreaterThan(
          field.pageHeight - initialledPaddingBottom(recipients),
        );
      }
    }
  });

  it('labels the initials', () => {
    const { result, pages } = rendered[name];

    for (const doc of result.documents.filter((d) => d.withInitials)) {
      for (const [at, page] of pages[doc.key].entries()) {
        expect(
          page.some((line) => squash(line).startsWith(squash('INITIALS'))),
          `${doc.key} p${at + 1}`,
        ).toBe(true);
      }
    }
  });
});

describe('the specs', () => {
  it('still gives every addendum initials and nothing else', () => {
    const { documents } = buildLeaseDocuments(PILOT_PACKAGE);

    expect(documents.filter((d) => d.withInitials).map((d) => d.kind)).toEqual(
      documents.filter((d) => d.kind === 'addendum').map((d) => d.kind),
    );
  });
});

/*
  THE FOOT HAS A WIDTH. Four initials cells fill the measure; a fifth signer
  used to push the row off the page edge, where a field is still extracted and
  nobody can reach it. Past four, the cells wrap to a second line and the body
  stops that much higher.
*/
describe('initials with more signers than fit on one line', () => {
  it('gives each of six signers one field on every page, unwrapped, inside the page', async () => {
    const parties = [
      { name: 'Landlord One', role: 'landlord' as const },
      { name: 'Landlord Two', role: 'landlord' as const },
      { name: 'Tenant One', role: 'tenant' as const },
      { name: 'Tenant Two', role: 'tenant' as const },
      { name: 'Tenant Three', role: 'tenant' as const },
      { name: 'Tenant Four', role: 'tenant' as const },
    ];

    const { rendered: docs } = await renderLease({ ...PICANA, parties });
    const addendum = docs.find((doc) => doc.key.startsWith('addendum:'));

    if (!addendum) {
      throw new Error('the Picana matter selects no addendum');
    }

    const fields = (await extractPlaceholdersFromPDF(addendum.pdf)).filter(
      (p) => p.fieldAndMeta.type === FieldType.INITIALS,
    );
    const pageCount = (await pageLines(addendum.pdf)).length;

    // Counted, not iterated: six wrapped tokens produced NO fields, and a loop
    // over the pages that have fields passed on that.
    expect(fields).toHaveLength(parties.length * pageCount);

    for (let page = 1; page <= pageCount; page += 1) {
      expect(
        fields
          .filter((p) => p.page === page)
          .map((p) => p.recipient)
          .sort(),
      ).toEqual(['r1', 'r2', 'r3', 'r4', 'r5', 'r6']);
    }

    for (const field of fields) {
      expect(field.placeholder).not.toMatch(/[\r\n]/);
      expect(field.x + field.width).toBeLessThanOrEqual(field.pageWidth - 90);
      expect(field.y).toBeGreaterThan(field.pageHeight - initialledPaddingBottom(parties.length));
    }
  }, 120_000);
});
