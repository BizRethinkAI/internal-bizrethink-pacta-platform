type SectionItem = { section: string; number: string | null };

export const mcaSectionName = (section: string): string => {
  const names: Record<string, string> = {
    appendix: 'Fee Schedule',
    'split-funding-exhibit': 'Split Funding Authorization exhibit',
    'permission-to-release-exhibit': 'Permission to Release exhibit',
  };
  return (
    names[section] ??
    section
      .split('-')
      .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
      .join(' ')
  );
};

/** Presentation only: use the existing citation, never assign a new number.
 * Reusable-only sections have no citation. A review combining different
 * selections must not claim a common parent number when those numbers differ. */
export const mcaSectionHeading = (section: string, items: Pick<SectionItem, 'number'>[]): string => {
  const numbers = [...new Set(items.flatMap((item) => (item.number ? [item.number.split('.')[0]] : [])))];
  const name = mcaSectionName(section);
  return numbers.length === 1 ? `${numbers[0]}. ${name}` : name;
};

/** Preserve exact document/field order, even when a section resumes later.
 * A leading field group gets its heading from the numbered clauses that follow. */
export const groupMcaSections = <T extends SectionItem>(items: T[]) => {
  const groups: { section: string; heading: string; items: T[] }[] = [];
  for (const item of items) {
    const previous = groups.at(-1);
    if (previous?.section === item.section) {
      previous.items.push(item);
    } else {
      groups.push({
        section: item.section,
        heading: mcaSectionHeading(
          item.section,
          items.filter((entry) => entry.section === item.section),
        ),
        items: [item],
      });
    }
  }
  return groups;
};
