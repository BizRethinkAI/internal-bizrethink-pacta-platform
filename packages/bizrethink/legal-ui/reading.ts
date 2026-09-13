/** Presentation metadata only. Never part of a legal-content fingerprint. */
export type LegalReference = {
  kind: 'reference';
  text: string;
  targetKind: 'clause' | 'section';
  targetSlug: string;
  instrument: string;
  section: string;
  context: string;
};

export type LegalSegment = { kind: 'text'; text: string } | LegalReference;
export type LegalReading = {
  number: string | null;
  context: string;
  segments: LegalSegment[];
};

export const subjectLabel = (value: string) =>
  value.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

/** Break at existing paragraph boundaries only; retained separators keep the text exact. */
export const readingParagraphs = (segments: LegalSegment[]): LegalSegment[][] => {
  const paragraphs: LegalSegment[][] = [[]];
  for (const segment of segments) {
    if (segment.kind === 'reference') {
      paragraphs[paragraphs.length - 1].push(segment);
      continue;
    }
    const chunks = segment.text.split(/(\n\s*\n)/);
    chunks.forEach((text, index) => {
      if (text) {
        paragraphs[paragraphs.length - 1].push({ kind: 'text', text });
      }
      if (index % 2 === 1) {
        paragraphs.push([]);
      }
    });
  }
  return paragraphs.filter((paragraph) => paragraph.length > 0);
};
