import { Button } from '@documenso/ui/primitives/button';
import { Input } from '@documenso/ui/primitives/input';
import { Trans } from '@lingui/react/macro';
import { useSearchParams } from 'react-router';
import { subjectLabel } from './reading';

export const CatalogueToolbar = ({
  subjects,
  instruments,
  kinds,
}: {
  subjects: string[];
  instruments?: { id: string; title: string }[];
  kinds?: { id: string; title: string }[];
}) => {
  const [params, setParams] = useSearchParams();
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.delete('item');
    next.delete('context');
    setParams(next, { preventScrollReset: true, replace: key === 'q' });
  };
  const selectClass = 'h-10 min-w-0 rounded-md border border-input bg-background px-3 text-sm';
  return (
    <search className="my-5 flex flex-wrap items-center gap-2" aria-label="Filter library">
      <Input
        aria-label="Search library"
        placeholder="Search headings or full wording…"
        className="min-w-48 flex-1"
        value={params.get('q') ?? ''}
        onChange={(event) => set('q', event.target.value)}
      />
      {instruments && (
        <select
          aria-label="Instrument"
          className={`${selectClass} max-w-full sm:max-w-64`}
          value={
            instruments.some((item) => item.id === params.get('instrument')) ? (params.get('instrument') ?? '') : ''
          }
          onChange={(event) => set('instrument', event.target.value)}
        >
          <option value="">All instruments</option>
          {instruments.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      )}
      <select
        aria-label="Subject"
        className={selectClass}
        value={subjects.includes(params.get('subject') ?? '') ? (params.get('subject') ?? '') : ''}
        onChange={(event) => set('subject', event.target.value)}
      >
        <option value="">All subjects</option>
        {subjects.map((subject) => (
          <option key={subject} value={subject}>
            {subjectLabel(subject)}
          </option>
        ))}
      </select>
      {kinds && (
        <select
          aria-label="Content type"
          className={selectClass}
          value={params.get('kind') ?? ''}
          onChange={(event) => set('kind', event.target.value)}
        >
          <option value="">All types</option>
          {kinds.map((kind) => (
            <option key={kind.id} value={kind.id}>
              {kind.title}
            </option>
          ))}
        </select>
      )}
      <select
        aria-label="Review status"
        className={selectClass}
        value={
          ['approved', 'unapproved', 'findings'].includes(params.get('status') ?? '')
            ? (params.get('status') ?? '')
            : ''
        }
        onChange={(event) => set('status', event.target.value)}
      >
        <option value="">All review states</option>
        <option value="unapproved">No current approval</option>
        <option value="approved">Current approval</option>
        <option value="findings">Open findings</option>
      </select>
      {['q', 'instrument', 'subject', 'kind', 'status'].some((key) => params.has(key)) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const next = new URLSearchParams(params);
            for (const key of ['q', 'instrument', 'subject', 'kind', 'status', 'item', 'context']) {
              next.delete(key);
            }
            setParams(next, { preventScrollReset: true });
          }}
        >
          <Trans>Clear filters</Trans>
        </Button>
      )}
    </search>
  );
};
