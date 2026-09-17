import type { LegalSegment } from '../../legal-ui/reading';
import type { McaReviewItem, McaReviewPackage } from './package-schema';

export type ReviewDocument = McaReviewPackage['documents'][number];
export type FieldPart = { kind: 'text' | 'field'; text: string; original: string; label?: string };

// Review annotations for these exact saved Payzli passages, verified against the
// vendored letter. They do not fill fields or merge its two percentages.
//
// The instruction passage's pin was re-taken on 2026-09-17, when the letter went
// back to the processor form's own wording under ADR 0019. A pin is to exact
// text, so a changed passage loses its labels until somebody re-reads it and
// re-takes the pin — which is the point, not an inconvenience.
const processorFields: Record<string, Record<string, string>> = {
  ff37bc9f6a1a6a76ed467825716a32ecb6d09debeda9b3059be33910e4c1b1bd: {
    '1': 'Seller name',
    '9': 'Purchase agreement date',
    '8': 'Funding company name',
    '2': 'Purchase agreement percentage',
  },
  '9ce8158e21c079b7706e09a48fcadf4b8538c72a4572959684ed73f36dc65701': {
    '3': 'Processor withholding percentage',
    '16': 'Purchased amount',
  },
  '1d0a2a779211f94d25121e3bdcac79048c78769a0926e06f5bee2e732747cc2a': {
    '10': 'Funding company name',
    '11': 'Additional remittance details',
    '12': 'Bank name',
    '13': 'Routing number',
    '14': 'Account number',
    '15': 'Authorization contact',
  },
};

/** Only saved document fields supply labels; original notation remains recoverable. */
export const reviewFieldParts = (text: string, document: ReviewDocument, item: McaReviewItem): FieldPart[] => {
  const fields = document.sections.flatMap((section) => section.items.flatMap((entry) => entry.fields));
  const parts: FieldPart[] = [];
  let start = 0;
  for (const match of text.matchAll(/_*\{\{field:([^{}]+)\}\}_*|_*«(\d+)»_*/g)) {
    if (match.index > start) {
      const plain = text.slice(start, match.index);
      parts.push({ kind: 'text', text: plain, original: plain });
    }
    const label = match[1]
      ? (fields.find((field) => field.binding === match[1])?.label ?? 'Unmapped field')
      : document.control === 'processor-controlled'
        ? (processorFields[item.sourceFingerprint]?.[match[2]] ?? 'Unmapped form field')
        : 'Unmapped form field';
    parts.push({ kind: 'field', original: match[0], label, text: `[${label}]` });
    start = match.index + match[0].length;
  }
  if (start < text.length) {
    const plain = text.slice(start);
    parts.push({ kind: 'text', text: plain, original: plain });
  }
  return parts;
};

/** Existing lines and sequential (a)…(b) paragraphs; references and characters are untouched. */
export const reviewParagraphs = (segments: LegalSegment[]): LegalSegment[][] => {
  const text = segments.map((segment) => segment.text).join('');
  const boundaries = new Set<number>();
  for (const match of text.matchAll(/\n+/g)) {
    boundaries.add(match.index + match[0].length);
  }
  for (const line of text.matchAll(/(?:^|\n)[^\n]*/g)) {
    if (!/^\s*\(a\)\s/.test(line[0])) {
      continue;
    }
    let expected = 'b'.charCodeAt(0);
    for (const match of line[0].matchAll(/[.;:]\s+(?=\(([b-h])\)\s)/g)) {
      if (match[1].charCodeAt(0) === expected) {
        boundaries.add(line.index + match.index + match[0].length);
        expected += 1;
      }
    }
  }
  const paragraphs: LegalSegment[][] = [[]];
  let position = 0;
  for (const segment of segments) {
    if (segment.kind === 'reference') {
      paragraphs[paragraphs.length - 1].push(segment);
      position += segment.text.length;
      continue;
    }
    let offset = 0;
    for (let index = 1; index <= segment.text.length; index += 1) {
      if (boundaries.has(position + index)) {
        paragraphs[paragraphs.length - 1].push({ kind: 'text', text: segment.text.slice(offset, index) });
        paragraphs.push([]);
        offset = index;
      }
    }
    if (offset < segment.text.length) {
      paragraphs[paragraphs.length - 1].push({ kind: 'text', text: segment.text.slice(offset) });
    }
    position += segment.text.length;
  }
  return paragraphs.filter((paragraph) => paragraph.length > 0);
};

export const fieldRequirement = (field: McaReviewItem['fields'][number]) => {
  if (field.condition === 'guarantor.kind = entity') {
    return 'Required when the guarantor is an entity';
  }
  if (field.condition) {
    return 'Conditional requirement — see field details';
  }
  return field.required ? 'Required' : 'Optional';
};

export const selectionLabel = (item: McaReviewItem) => {
  if (item.included) {
    return item.reading.context === 'Saved provider selection' ? 'Saved provider selection' : 'Example selection';
  }
  const note = item.selectionNote?.replace(/^Alternative — /, '').split('. Citations apply')[0];
  return note ? `Alternative — ${note}` : 'Alternative — separate selection';
};
export const reviewItemLabel = (item: McaReviewItem) =>
  `${item.reading.number ?? 'Reusable'} ${item.heading}${item.kind === 'clause' ? ` · ${selectionLabel(item)}` : ''}`;

/** Consecutive groups preserve the source field order, even when a subject recurs. */
export const groupReviewFields = (fields: McaReviewItem['fields']) => {
  const groups: { label: string; fields: McaReviewItem['fields'] }[] = [];
  for (const field of fields) {
    const label = field.label.includes(' — ') ? field.label.split(' — ')[0] : 'Other fields';
    const last = groups.at(-1);
    if (last?.label === label) {
      last.fields.push(field);
    } else {
      groups.push({ label, fields: [field] });
    }
  }
  return groups;
};

type SourceEntry = McaReviewPackage['requirements'][number]['entries'][number];
export const sourceEntryPresentation = (entry: SourceEntry, entries: SourceEntry[] = []) =>
  entry.paragraphs.map((original) => {
    const at = original.indexOf(': ');
    const key = original.slice(0, at);
    let text = at < 0 ? original : original.slice(at + 2);
    let citation: string | undefined;
    const names: Record<string, string> = {
      Label: 'Form label',
      Verbatim: 'Source wording',
      'Only Prescribed Content': 'Prescribed content only',
      'Third Column Empty': 'Third column',
      'Also Permitted': 'Additional permitted wording',
      Description: 'Description',
      Citation: 'Authority',
      Reference: 'Calculation reference',
      Requires: 'Required information',
      Row: 'Disclosure label',
      Evidence: 'Recorded source evidence',
      'Label Prescribed': 'Label prescribed',
      'Provider Drafted': 'Provider-authored wording',
      'Label Suffix': 'Label continuation',
    };
    if (['Only Prescribed Content', 'Label Prescribed'].includes(key) && ['true', 'false'].includes(text)) {
      text = text === 'true' ? 'Yes' : 'No';
    }
    if (key === 'Third Column Empty' && text === 'true') {
      text = 'Recorded as empty';
    }
    if (key === 'Verbatim' && text === 'Not prescribed / not recorded') {
      text = 'No wording supplied in this saved entry (not prescribed / not recorded).';
    }
    if (key === 'Provider Drafted') {
      const wording = /^Citation: (.+); Text: ([\s\S]+)$/.exec(text);
      if (wording) {
        citation = wording[1];
        text = wording[2];
      }
    }
    if (key === 'Reference' && text.startsWith('Kind: ')) {
      const labels = new Map(
        entries.flatMap((row) =>
          row.paragraphs.filter((part) => part.startsWith('Id: ')).map((part) => [part.slice(4), row.label] as const),
        ),
      );
      const difference = /^Kind: difference; Minuend: ([^;]+); Subtrahend: ([^;]+)$/.exec(text);
      if (difference && labels.has(difference[1]) && labels.has(difference[2])) {
        text = `${labels.get(difference[1])} − ${labels.get(difference[2])}`;
      } else if (text === 'Kind: sum-of-preceding') {
        text = 'Sum of the preceding amounts';
      } else {
        text = 'A calculation reference is recorded in the saved specification below.';
      }
    }
    return {
      label: names[key] ?? 'Additional saved information',
      text,
      original,
      citation,
      technical: key === 'Id' || (key === 'Label' && text === entry.label),
    };
  });

export const searchSavedPackage = (snapshot: McaReviewPackage, query: string) => {
  const entries = [
    ...snapshot.documents.flatMap((document) =>
      document.sections.flatMap((section) =>
        section.items.map((item) => ({
          id: `content:${item.slug}`,
          documentId: document.id,
          label: reviewItemLabel(item),
          detail: document.title,
          section: section.id as string | null,
          slug: item.slug,
          search: [
            item.text,
            ...item.fields.map((field) => field.label),
            ...reviewFieldParts(item.text, document, item).map((part) => part.text),
          ].join(' '),
        })),
      ),
    ),
    ...snapshot.requirements.map((requirement) => ({
      id: `requirement:${requirement.slug}`,
      documentId: 'requirements',
      label: `${requirement.jurisdictionName} · ${requirement.citation}`,
      detail: 'Disclosures & requirements',
      section: null,
      slug: `requirement:${requirement.slug}`,
      search: requirement.entries.flatMap((entry) => [entry.label, ...entry.paragraphs]).join(' '),
    })),
    ...(snapshot.kind === 'provider'
      ? snapshot.externalDocuments.map((document) => ({
          id: `processor:${document.id}`,
          documentId: `processor:${document.id}`,
          label: `${document.processor} · ${document.title}`,
          detail: 'Processor form',
          section: null,
          slug: `processor:${document.id}`,
          search: `${document.version} ${document.reference} ${document.content ?? ''}`,
        }))
      : []),
  ];
  const needle = query.trim().toLocaleLowerCase();
  return entries.filter((entry) =>
    `${entry.label} ${entry.detail} ${entry.search}`.toLocaleLowerCase().includes(needle),
  );
};

/** Only UI metadata uses these labels; never apply this substitution to legal wording. */
export const readableReviewMetadata = (text: string) => {
  const labels: Record<string, string> = {
    concurrentPositions: 'concurrent positions',
    guarantyScope: 'guaranty scope',
    disputeResolution: 'dispute resolution',
    'split-only': 'processor split collections',
    'limited-conduct': 'limited conduct',
    'full-performance': 'full performance',
    'merchant-elects': 'merchant equipment election',
    'merchant-state': 'merchant state',
    'payoff-only': 'payoff only',
    'equipment-lease': 'equipment lease',
    'individual-report': 'individual report',
    'broker-channel': 'broker channel',
  };
  return text
    .replace(
      /\b(?:concurrentPositions|guarantyScope|disputeResolution|split-only|limited-conduct|full-performance|merchant-elects|merchant-state|payoff-only|equipment-lease|individual-report|broker-channel)\b/g,
      (value) => labels[value],
    )
    .replace(/: (true|false)$/, (_match, value) => `: ${value === 'true' ? 'Yes' : 'No'}`);
};
