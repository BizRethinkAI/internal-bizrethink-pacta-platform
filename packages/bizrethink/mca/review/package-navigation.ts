import type { McaReviewPackage } from './package-schema';

/** Navigation uses only the shared snapshot, including its alternatives and saved numbering. */
export const packageReviewIndex = (snapshot: McaReviewPackage) =>
  snapshot.documents.flatMap((document) =>
    document.sections.flatMap((section) =>
      section.items.map((item) => ({
        ...item,
        instrument: document.id,
        documentTitle: document.title,
        section: section.id,
        sectionName: section.name,
      })),
    ),
  );

export const searchPackageReviewIndex = (items: ReturnType<typeof packageReviewIndex>, query: string) => {
  const needle = query.trim().toLocaleLowerCase();
  return items.filter((item) =>
    `${item.heading} ${item.text} ${item.reading.number ?? ''}`.toLocaleLowerCase().includes(needle),
  );
};
