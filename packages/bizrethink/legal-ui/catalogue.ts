type CatalogueItem = {
  slug: string;
  heading: string;
  body: string;
  section: string;
  instrument?: string;
  kind?: string;
  approved: boolean;
  outstanding: number;
};

export const filterCatalogue = <T extends CatalogueItem>(items: T[], params: URLSearchParams): T[] => {
  const query = (params.get('q') ?? '').trim().toLocaleLowerCase();
  const instrument = items.some((item) => item.instrument === params.get('instrument'))
    ? params.get('instrument')
    : null;
  const subject = items.some((item) => item.section === params.get('subject')) ? params.get('subject') : null;
  const kind = items.some((item) => item.kind === params.get('kind')) ? params.get('kind') : null;
  return items.filter(
    (item) =>
      (!instrument || item.instrument === instrument) &&
      (!subject || item.section === subject) &&
      (!kind || item.kind === kind) &&
      (!query || `${item.heading} ${item.slug} ${item.body}`.toLocaleLowerCase().includes(query)) &&
      (params.get('status') !== 'approved' || item.approved) &&
      (params.get('status') !== 'unapproved' || !item.approved) &&
      (params.get('status') !== 'findings' || item.outstanding > 0),
  );
};
