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

/*
  UTILITIES, NOT AN INLINE STYLESHEET.

  The first attempt shipped a `<style>` element with scoped custom properties.
  It reached the browser and the browser refused it: this app serves a NONCED
  `style-src-elem` CSP (apps/remix/server/security-headers.ts), so an unnonced
  style element is dropped silently. The markup rendered, the class names
  existed, and every one of them was inert.

  THREE KINDS OF THING MEAN THREE THINGS. A statutory bound is a limit the
  answerer may not cross. A suggestion is a number they may take or leave. An
  unanswered required field is work still owed. All three rendered as grey
  dashed boxes, so the interview could not say which was which — and which of
  its constraints come from Florida and which come from the landlord is the one
  thing a lease builder must communicate.

  Dark variants are written out because the app's `dark:` is a class strategy.
*/
export const LB_ACCENT_TEXT = 'text-[#1f3a5f] dark:text-[#8fb3d9]';
export const LB_ACTION_TEXT = 'text-[#a2560c] dark:text-[#d99a4e]';
export const LB_STATUTE = 'border-l-[3px] border-l-[#1f3a5f] bg-[#eef2f7] dark:border-l-[#8fb3d9] dark:bg-[#1a2431]';
export const LB_SUGGEST = 'border-l-[3px] border-l-[#2f6b4f] bg-[#edf5f0] dark:border-l-[#6bab8a] dark:bg-[#17251d]';
export const LB_SUGGEST_TEXT = 'text-[#2f6b4f] dark:text-[#6bab8a]';
/* A ring rather than a child-selector variant: `[&_input]:` takes one utility,
   not a class list, and the ring marks the control whatever kind it is. */
export const LB_OWED = 'rounded-md ring-1 ring-[#a2560c] dark:ring-[#d99a4e]';

export type InterviewFieldProps = {
  field: InterviewField;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
  /** A blocking finding tied to this field, if any. */
  error?: string;
  /** Needed only by address fields, which look up through an access-gated procedure. */
  organisationId?: string;
  /** Present when this field may be put to the tenant instead. */
  delegation?: { asked: boolean; onToggle: (asked: boolean) => void };
  /**
   * The clause this answer ends up in, where the lease includes one.
   *
   * Per-lease rather than per-field: numbering is derived from what survives
   * selection, so a clause dropped earlier renumbers everything after it.
   */
  clause?: { number: string; heading: string };
};

export const InterviewFieldControl = ({
  field,
  value,
  onChange,
  error,
  organisationId,
  delegation,
  clause,
}: InterviewFieldProps) => {
  const id = `field-${field.name}`;

  /*
    WORK STILL OWED, marked on the field itself.
    
    The rail counts these, but a count sends somebody hunting down a step of
    seven questions for the two that are blank. A boolean is never owed — false
    is an answer — and neither is an optional field.
  */
  const owed =
    field.required === true &&
    field.kind !== 'boolean' &&
    (value === null || value === undefined || String(value).trim() === '');

  return (
    <div className="border-border border-b py-5 last:border-b-0">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <Label htmlFor={id} className="font-medium text-base leading-snug">
            {field.label}
            {field.required && (
              <span className={owed ? `${LB_ACTION_TEXT} ml-1` : 'ml-1 text-muted-foreground'}>*</span>
            )}
          </Label>

          {field.help && <p className="mt-1.5 text-muted-foreground text-sm leading-relaxed">{field.help}</p>}

          {/*
            Shown for every field a statute constrains, whether or not the
            current answer is out of bounds. Learning the limit only when you
            have already broken it is how a form teaches nothing.
          */}
          {field.statute && (
            <div className={`${LB_STATUTE} mt-3 flex gap-2.5 rounded-r-md py-2.5 pr-3 pl-3`}>
              <Scale className={`${LB_ACCENT_TEXT} mt-0.5 h-4 w-4 flex-none`} />
              <div className="text-sm">
                <span className={`${LB_ACCENT_TEXT} font-semibold text-xs tracking-wide`}>{field.statute.cite}</span>
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
          {/*
            GREEN, not the same grey box as the statute above it. One is a
            bound Florida sets and the other is a number somebody may take or
            leave; rendering them identically was the interview's way of saying
            it could not tell them apart either.
          */}
          {field.suggestion && (
            <div className={`${LB_SUGGEST} mt-3 flex items-start gap-2 rounded-r-md py-2.5 pr-3 pl-3`}>
              <Lightbulb className={`${LB_SUGGEST_TEXT} mt-0.5 h-4 w-4 flex-none`} />
              <div className="text-sm">
                <p className="text-muted-foreground leading-relaxed">{field.suggestion.note}</p>
                {value !== field.suggestion.value && (
                  <button
                    type="button"
                    className={`${LB_SUGGEST_TEXT} mt-1.5 font-semibold text-sm underline underline-offset-2 hover:no-underline`}
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

          {/*
            WHAT THIS ANSWER BECOMES.

            The interview asked sixty questions and never said what any of them
            turned into. A landlord typing a figure into "what do you charge if
            the tenant refuses access" had no way to know it lands in 8.7
            Administrative Charges — so the question read as a form field rather
            than as a term they were drafting.

            Absent where the clause is not selected for this lease, because a
            number pointing at a clause the document does not contain is worse
            than no pointer.
          */}
          {clause && (
            <p className="mt-2.5 text-muted-foreground text-xs">
              Becomes clause <span className="font-semibold text-foreground">{clause.number}</span> · {clause.heading}
            </p>
          )}
        </div>

        <div>
          <div className={owed ? LB_OWED : undefined}>
            <FieldInput id={id} field={field} value={value} onChange={onChange} />
          </div>

          {/*
            Only the things a tenant knows and a landlord would otherwise
            guess — their children's names, their dog's breed, where they live
            now. Which fields may appear here is decided server-side from the
            field definitions; this toggle only selects among them.
          */}
          {delegation && (
            <label className="mt-3 flex items-start gap-2.5 rounded-md border border-dashed p-3">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={delegation.asked}
                onChange={(event) => delegation.onToggle(event.target.checked)}
              />
              <span className="text-sm">
                <span className="font-medium">Ask the tenant instead</span>
                <span className="mt-0.5 block text-muted-foreground text-xs">
                  They answer it on the review link, so you are not guessing and then correcting it by email. You see
                  what they wrote before anything is sent for signature.
                </span>
              </span>
            </label>
          )}

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
      /*
        '' rather than undefined for an unanswered select.

        `undefined` puts Radix's useControllableState in UNCONTROLLED mode, and
        the first answer flips it to controlled — React logs the warning, and
        the answer can then never be cleared back to the placeholder, because
        passing undefined again no longer resets the internal value. Radix
        reserves the empty string for exactly this: it clears the value and
        shows the placeholder.
      */
      <Select
        value={value === null || value === undefined ? '' : String(value)}
        onValueChange={(next) => onChange(next)}
      >
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
