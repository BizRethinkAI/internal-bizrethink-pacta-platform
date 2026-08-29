import type { CustomClauseInput } from '@bizrethink/customizations/lease/clauses/custom';
import { ASSERTION_TAGS } from '@bizrethink/customizations/lease/clauses/custom';
import { Button } from '@documenso/ui/primitives/button';
import { Input } from '@documenso/ui/primitives/input';
import { Label } from '@documenso/ui/primitives/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@documenso/ui/primitives/select';
import { Textarea } from '@documenso/ui/primitives/textarea';
import { Plus, Trash2 } from 'lucide-react';

/**
 * Writing your own clauses.
 *
 * This is the feature the whole project exists for. The 2026 Zillow lease put
 * six substantive lettered clauses into a free-text box labelled "OTHERS",
 * under two headings reading "N/A" — no number, no contents entry, and nothing
 * else in the document able to refer to them. The most negotiated terms in a
 * 26-page lease sat as unnumbered prose on page 21.
 *
 * A clause written here is an ordinary clause. It takes a real section, gets a
 * derived number, appears in the contents, and is checked against the rest of
 * the lease.
 */

export type CustomClauseEditorProps = {
  /** Sections the engine knows, so an author cannot pick one that fails later. */
  sections: string[];
  clauses: CustomClauseInput[];
  onChange: (clauses: CustomClauseInput[]) => void;
};

const SECTION_LABELS: Record<string, string> = {
  parties: 'Parties',
  premises: 'Premises',
  term: 'Term',
  rent: 'Rent',
  deposit: 'Deposit',
  use: 'Use of the property',
  utilities: 'Utilities and insurance',
  maintenance: 'Maintenance',
  access: 'Access and inspection',
  default: 'Default and move-out',
  rules: 'Rules',
  general: 'General provisions',
};

export const CustomClauseEditor = ({ sections, clauses, onChange }: CustomClauseEditorProps) => {
  const update = (index: number, patch: Partial<CustomClauseInput>) => {
    onChange(clauses.map((clause, i) => (i === index ? { ...clause, ...patch } : clause)));
  };

  const add = () => {
    onChange([...clauses, { heading: '', body: '', section: sections[0] ?? 'general', asserts: [] }]);
  };

  return (
    <div className="mt-4 space-y-5">
      {clauses.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
          No clauses of your own yet. Anything the library does not cover goes here and becomes a numbered clause in the
          lease.
        </p>
      )}

      {clauses.map((clause, index) => (
        // Index as key: clauses have no id yet, and reordering is not offered.
        <div key={index} className="rounded-lg border p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-4">
              <div>
                <Label htmlFor={`heading-${index}`}>Heading</Label>
                <Input
                  id={`heading-${index}`}
                  value={clause.heading}
                  placeholder="Pool Equipment Replacement"
                  onChange={(e) => update(index, { heading: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor={`section-${index}`}>Which part of the lease does it belong in?</Label>
                <p className="mt-0.5 mb-1.5 text-muted-foreground text-xs">
                  It is numbered within that section, after the reviewed clauses already there.
                </p>
                <Select value={clause.section} onValueChange={(next) => update(index, { section: next })}>
                  <SelectTrigger id={`section-${index}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section) => (
                      <SelectItem key={section} value={section}>
                        {SECTION_LABELS[section] ?? section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor={`body-${index}`}>The clause</Label>
                <Textarea
                  id={`body-${index}`}
                  rows={5}
                  value={clause.body}
                  placeholder="Landlord shall replace the pool pump and filtration equipment at Landlord's expense when it fails in ordinary use."
                  onChange={(e) => update(index, { body: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor={`asserts-${index}`}>Does this cover ground the lease already covers?</Label>
                <p className="mt-0.5 mb-1.5 text-muted-foreground text-xs">
                  Optional. Tagging is what makes a duplicate detectable — in the 2026 lease, joint-and-several
                  liability was stated twice because nothing could see across the two.
                </p>
                <Select
                  value={clause.asserts[0] ?? '__none'}
                  onValueChange={(next) => update(index, { asserts: next === '__none' ? [] : [next] })}
                >
                  <SelectTrigger id={`asserts-${index}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Nothing in particular</SelectItem>
                    {ASSERTION_TAGS.map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        {tag.replace(/-/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(clauses.filter((_, i) => i !== index))}
              aria-label="Remove this clause"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}

      <Button variant="outline" onClick={add}>
        <Plus className="mr-2 h-4 w-4" />
        Add a clause
      </Button>
    </div>
  );
};
