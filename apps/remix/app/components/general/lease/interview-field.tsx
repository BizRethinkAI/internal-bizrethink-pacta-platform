import type { InterviewField } from '@bizrethink/customizations/lease/interview/steps';
import { trpc } from '@documenso/trpc/react';
import { Input } from '@documenso/ui/primitives/input';
import { Label } from '@documenso/ui/primitives/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@documenso/ui/primitives/select';
import { Switch } from '@documenso/ui/primitives/switch';
import { Textarea } from '@documenso/ui/primitives/textarea';
import { Check, Lightbulb, Loader2, MapPin, Scale } from 'lucide-react';
import { useState } from 'react';

/**
 * One question in the lease interview.
 *
 * The statute block is the reason this component exists rather than a plain
 * input. The document-assembly literature is blunt about it: completion
 * without understanding is a failure — someone who finishes an interview
 * without knowing what they agreed to has not been served. That is exactly how
 * the 2026 Zillow lease failed, and the fix is to put the constraint where the
 * number is typed rather than in a findings panel afterwards.
 *
 * The wording states the requirement and what the answer does. Never advice —
 * the same unauthorized-practice-of-law line the rule pack holds, asserted by
 * a test over the interview definition.
 */

export type FieldValue = string | number | boolean | null;

export type InterviewFieldProps = {
  field: InterviewField;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
  /** A blocking finding tied to this field, if any. */
  error?: string;
  /** Needed only by address fields, which look up through an access-gated procedure. */
  organisationId?: string;
};

export const InterviewFieldControl = ({ field, value, onChange, error, organisationId }: InterviewFieldProps) => {
  const id = `field-${field.name}`;

  return (
    <div className="border-border border-b py-5 last:border-b-0">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <Label htmlFor={id} className="font-medium text-base leading-snug">
            {field.label}
            {field.required && <span className="ml-1 text-muted-foreground">*</span>}
          </Label>

          {field.help && <p className="mt-1.5 text-muted-foreground text-sm leading-relaxed">{field.help}</p>}

          {/*
            Shown for every field a statute constrains, whether or not the
            current answer is out of bounds. Learning the limit only when you
            have already broken it is how a form teaches nothing.
          */}
          {field.statute && (
            <div className="mt-3 flex gap-2 rounded-md border border-border bg-muted/40 p-3">
              <Scale className="mt-0.5 h-4 w-4 flex-none text-muted-foreground" />
              <div className="text-sm">
                <span className="font-medium">{field.statute.cite}</span>
                <p className="mt-0.5 text-muted-foreground leading-relaxed">{field.statute.note}</p>
              </div>
            </div>
          )}

          {/*
            Only ever on a field no statute constrains — the two are mutually
            exclusive by type and by test. Where Florida sets a limit, the
            limit is the only thing shown; offering a number there would be
            advising on the statute rather than stating it.

            Phrased as an observation and applied by an explicit click, so the
            answer on the document is always one somebody chose.
          */}
          {field.suggestion && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-border border-dashed p-3">
              <Lightbulb className="mt-0.5 h-4 w-4 flex-none text-muted-foreground" />
              <div className="text-sm">
                <p className="text-muted-foreground leading-relaxed">{field.suggestion.note}</p>
                {value !== field.suggestion.value && (
                  <button
                    type="button"
                    className="mt-1.5 font-medium text-foreground text-sm underline underline-offset-2 hover:no-underline"
                    onClick={() => onChange(field.suggestion?.value ?? null)}
                  >
                    Use{' '}
                    {typeof field.suggestion.value === 'number'
                      ? field.suggestion.value
                      : (field.options?.find((o) => o.value === field.suggestion?.value)?.label ??
                        field.suggestion.value)}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div>
          <FieldInput id={id} field={field} value={value} onChange={onChange} />

          {field.address === true && organisationId !== undefined && (
            <AddressLookup organisationId={organisationId} value={value} onChange={onChange} />
          )}

          {error && <p className="mt-2 font-medium text-destructive text-sm">{error}</p>}
        </div>
      </div>
    </div>
  );
};

const FieldInput = ({ id, field, value, onChange }: { id: string } & Omit<InterviewFieldProps, 'error'>) => {
  if (field.kind === 'boolean') {
    return (
      <div className="flex items-center gap-3">
        <Switch id={id} checked={value === true} onCheckedChange={(next) => onChange(next)} />
        <span className="text-muted-foreground text-sm">{value === true ? 'Yes' : 'No'}</span>
      </div>
    );
  }

  if (field.kind === 'select') {
    return (
      <Select value={value === null ? undefined : String(value)} onValueChange={(next) => onChange(next)}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Choose…" />
        </SelectTrigger>
        <SelectContent>
          {(field.options ?? []).map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.kind === 'textarea') {
    return (
      <Textarea
        id={id}
        rows={4}
        placeholder={field.placeholder}
        value={value === null ? '' : String(value)}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  const isNumeric = field.kind === 'number' || field.kind === 'usd';

  return (
    <div className="relative">
      {field.kind === 'usd' && (
        <span className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground text-sm">$</span>
      )}
      <Input
        id={id}
        type={field.kind === 'date' ? 'date' : isNumeric ? 'number' : 'text'}
        inputMode={isNumeric ? 'decimal' : undefined}
        /*
          A floor on the control itself, so the spinner and the arrow keys
          cannot produce a value that is not an answer. Belt to the validation
          layer's braces: a real matter reached production carrying
          `depositReturnDays: -124`, which every statutory check let through
          because they were all one-sided.
        */
        min={isNumeric ? 0 : undefined}
        className={field.kind === 'usd' ? 'pl-7 tabular-nums' : isNumeric ? 'tabular-nums' : undefined}
        placeholder={field.placeholder}
        value={value === null ? '' : String(value)}
        onChange={(event) => {
          const raw = event.target.value;

          if (!isNumeric) {
            onChange(raw);

            return;
          }

          // An empty numeric field is unanswered, not zero. Zero is a real and
          // important answer here — "$0.00 due at execution" is the whole point
          // of the held-versus-collected split — so the two must stay distinct.
          onChange(raw === '' ? null : Number(raw));
        }}
      />
    </div>
  );
};

/**
 * Address normalisation, offered rather than applied.
 *
 * The free national source is the US Census geocoder, which is a LOOKUP and
 * not a typeahead — so this fires when the field loses focus, not per
 * keystroke. Free national autocomplete effectively does not exist: Google
 * Places requires billing, and Nominatim's terms discourage per-character
 * queries. Census is also a shared public service, and one request per
 * focus-loss is fair use of it where one per character is not.
 *
 * It never overwrites what was typed. Applying the match is a click, because
 * silently rewriting an address someone just entered is how a form loses an
 * apartment number.
 */
const AddressLookup = ({
  organisationId,
  value,
  onChange,
}: {
  organisationId: string;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
}) => {
  const [query, setQuery] = useState('');
  const typed = value === null ? '' : String(value);

  const lookup = trpc.bizrethink.leaseBuilder.property.lookupAddress.useQuery(
    { organisationId, address: query },
    { enabled: query.length > 8, staleTime: 5 * 60 * 1000, retry: false },
  );

  const match = lookup.data?.match ?? null;
  const formatted = match ? `${match.addressLine}, ${match.city}, ${match.state} ${match.postalCode}` : null;

  // Nothing useful to say when the match is what is already in the box.
  if (formatted !== null && formatted === typed.trim()) {
    return null;
  }

  return (
    <div className="mt-2">
      {query.length <= 8 && (
        <button
          type="button"
          className="text-muted-foreground text-xs underline underline-offset-2 hover:text-foreground"
          onClick={() => setQuery(typed)}
        >
          Check this address
        </button>
      )}

      {lookup.isFetching && (
        <p className="flex items-center gap-2 text-muted-foreground text-xs">
          <Loader2 className="h-3 w-3 animate-spin" />
          Checking…
        </p>
      )}

      {!lookup.isFetching && query.length > 8 && formatted && (
        <div className="flex items-start justify-between gap-3 rounded-md border bg-muted/40 p-2.5">
          <p className="flex gap-2 text-xs">
            <MapPin className="mt-0.5 h-3 w-3 flex-none text-muted-foreground" />
            <span>{formatted}</span>
          </p>
          <button
            type="button"
            className="flex flex-none items-center gap-1 font-medium text-xs underline underline-offset-2"
            onClick={() => onChange(formatted)}
          >
            <Check className="h-3 w-3" />
            Use this
          </button>
        </div>
      )}

      {!lookup.isFetching && query.length > 8 && !formatted && (
        <p className="text-muted-foreground text-xs">
          No match from the US Census address service. Common for new construction — leave it as you typed it.
        </p>
      )}
    </div>
  );
};
