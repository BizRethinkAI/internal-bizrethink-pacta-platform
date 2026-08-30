import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@documenso/ui/primitives/dialog';
import { Input } from '@documenso/ui/primitives/input';
import { Label } from '@documenso/ui/primitives/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@documenso/ui/primitives/select';
import { Switch } from '@documenso/ui/primitives/switch';
import { Textarea } from '@documenso/ui/primitives/textarea';
import { Check, Loader2, MapPin, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

/**
 * Adding a property.
 *
 * A property is set up once and every lease written against it opens partly
 * answered, so the questions here are the ones that do not change between
 * tenancies — and each is here because it decides which clauses Florida
 * permits, not because it is nice to know.
 *
 * ADDRESS LOOKUP IS ON BLUR, NOT PER KEYSTROKE. The free national source is
 * the US Census geocoder, which is a lookup service rather than a typeahead —
 * and it is a shared public resource, so one request when the field loses
 * focus is fair use of it and one per character is not. What it returns that
 * matters is the COUNTY: it sets legal venue, landlords routinely do not know
 * it, and it is the only legally-relevant field available free nationally.
 *
 * It never overwrites what was typed. The match is offered, and applying it is
 * a click — silently rewriting an address someone just entered is how a form
 * loses an apartment number.
 */

type Draft = {
  label: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  county: string;
  propertyType: 'single-family' | 'duplex' | 'condo' | 'multi-family';
  yearBuilt: string;
  hasPool: boolean;
  hasHoa: boolean;
  hoaName: string;
  includedAppliances: string;
  landlords: { name: string; email: string }[];
  noticeName: string;
  noticeAddress: string;
};

const EMPTY: Draft = {
  label: '',
  addressLine: '',
  city: '',
  state: 'FL',
  postalCode: '',
  county: '',
  propertyType: 'single-family',
  // Empty, never a plausible default. Year built decides whether the federal
  // lead-paint disclosure is included, and a guessed year silently drops it.
  yearBuilt: '',
  hasPool: false,
  hasHoa: false,
  hoaName: '',
  includedAppliances: '',
  landlords: [{ name: '', email: '' }],
  noticeName: '',
  noticeAddress: '',
};

export type ExistingProperty = Draft & { id: string };

export type PropertyFormProps = {
  organisationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  /** Present when editing rather than adding. */
  existing?: ExistingProperty | null;
};

export const PropertyForm = ({ organisationId, open, onOpenChange, onCreated, existing }: PropertyFormProps) => {
  const [draft, setDraft] = useState<Draft>(existing ?? EMPTY);
  const [loadedId, setLoadedId] = useState<string | null>(existing?.id ?? null);
  const [lookupAddress, setLookupAddress] = useState('');

  /*
    Reseeded when the dialog is pointed at a different property. Keyed on the
    id rather than on `open`, so reopening the same one does not discard edits
    made and not yet saved.
  */
  if ((existing?.id ?? null) !== loadedId) {
    setLoadedId(existing?.id ?? null);
    setDraft(existing ?? EMPTY);
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((prev) => ({ ...prev, [key]: value }));

  const lookup = trpc.bizrethink.leaseBuilder.property.lookupAddress.useQuery(
    { organisationId, address: lookupAddress },
    { enabled: lookupAddress.length > 5, staleTime: 5 * 60 * 1000, retry: false },
  );

  const onSaved = () => {
    setDraft(EMPTY);
    setLoadedId(null);
    setLookupAddress('');
    onCreated();
    onOpenChange(false);
  };

  const create = trpc.bizrethink.leaseBuilder.property.create.useMutation({ onSuccess: onSaved });
  const update = trpc.bizrethink.leaseBuilder.property.update.useMutation({ onSuccess: onSaved });

  const saving = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  const match = lookup.data?.match ?? null;

  /* One line, so the geocoder gets the whole address rather than a fragment. */
  const oneLine = () =>
    [draft.addressLine, draft.city, `${draft.state} ${draft.postalCode}`.trim()].filter(Boolean).join(', ');

  const runLookup = () => {
    const address = oneLine();

    if (address.replace(/[\s,]/g, '').length > 8) {
      setLookupAddress(address);
    }
  };

  const applyMatch = () => {
    if (!match) {
      return;
    }

    setDraft((prev) => ({
      ...prev,
      addressLine: match.addressLine,
      city: match.city,
      state: match.state,
      postalCode: match.postalCode,
      county: match.county ?? prev.county,
      label: prev.label === '' ? match.addressLine : prev.label,
    }));
  };

  const canSubmit =
    draft.label.trim() !== '' &&
    draft.addressLine.trim() !== '' &&
    draft.city.trim() !== '' &&
    draft.postalCode.trim() !== '' &&
    draft.county.trim() !== '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit property' : 'Add a property'}</DialogTitle>
          <DialogDescription>
            {existing
              ? 'Changes apply to leases you start from now on. Leases already drafted keep what they were built with, so correcting a typo here cannot rewrite a document someone is reading.'
              : 'Set up once. Every lease written against this property opens with these answers already filled — a renewal becomes minutes rather than an hour.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div>
            <Label htmlFor="prop-label">What do you call it?</Label>
            <p className="mt-0.5 mb-1.5 text-muted-foreground text-xs">
              Only ever shown to you — it never appears in the lease.
            </p>
            <Input
              id="prop-label"
              value={draft.label}
              placeholder="29090 Picana Ln"
              onChange={(e) => set('label', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="prop-address">Street address</Label>
            <Input
              id="prop-address"
              value={draft.addressLine}
              placeholder="29090 Picana Lane"
              onChange={(e) => set('addressLine', e.target.value)}
              onBlur={runLookup}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="prop-city">City</Label>
              <Input
                id="prop-city"
                value={draft.city}
                onChange={(e) => set('city', e.target.value)}
                onBlur={runLookup}
              />
            </div>
            <div>
              <Label htmlFor="prop-state">State</Label>
              <Input
                id="prop-state"
                value={draft.state}
                maxLength={2}
                onChange={(e) => set('state', e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <Label htmlFor="prop-zip">ZIP</Label>
              <Input
                id="prop-zip"
                value={draft.postalCode}
                onChange={(e) => set('postalCode', e.target.value)}
                onBlur={runLookup}
              />
            </div>
          </div>

          {/* The lookup result. Offered, never applied silently. */}
          {lookup.isFetching && (
            <p className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking the address…
            </p>
          )}

          {!lookup.isFetching && match && (
            <div className="flex items-start justify-between gap-4 rounded-md border bg-muted/40 p-3">
              <div className="flex gap-2 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 flex-none text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {match.addressLine}, {match.city}, {match.state} {match.postalCode}
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    {match.county ? (
                      <>
                        <span className="font-medium">{match.county} County</span> — this sets the venue for any
                        proceeding under the lease.
                      </>
                    ) : (
                      'Matched, but no county was returned. Enter it below.'
                    )}
                  </p>
                </div>
              </div>

              <Button size="sm" variant="outline" onClick={applyMatch}>
                <Check className="mr-2 h-4 w-4" />
                Use this
              </Button>
            </div>
          )}

          {!lookup.isFetching && lookupAddress.length > 5 && !match && (
            <p className="text-muted-foreground text-sm">
              No match from the US Census address service. That is common for new construction — fill the county in
              yourself and carry on.
            </p>
          )}

          <div>
            <Label htmlFor="prop-county">County</Label>
            <p className="mt-0.5 mb-1.5 text-muted-foreground text-xs">
              Without the word "County" — the lease supplies that. Sets legal venue.
            </p>
            <Input
              id="prop-county"
              value={draft.county}
              placeholder="Pasco"
              onChange={(e) => set('county', e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="prop-type">What kind of property?</Label>
              <p className="mt-0.5 mb-1.5 text-muted-foreground text-xs">
                Load-bearing: Florida only lets maintenance duties shift to a tenant in a single-family home or duplex.
              </p>
              <Select
                value={draft.propertyType}
                onValueChange={(next) => set('propertyType', next as Draft['propertyType'])}
              >
                <SelectTrigger id="prop-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single-family">Single-family home</SelectItem>
                  <SelectItem value="duplex">Duplex</SelectItem>
                  <SelectItem value="condo">Condominium</SelectItem>
                  <SelectItem value="multi-family">Unit in a multi-family building</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="prop-year">Year built</Label>
              <p className="mt-0.5 mb-1.5 text-muted-foreground text-xs">
                Leave blank if you are not certain. Anything built before 1978 requires the federal lead-paint
                disclosure, and an unknown year includes it rather than skipping it.
              </p>
              <Input
                id="prop-year"
                type="number"
                inputMode="numeric"
                className="tabular-nums"
                value={draft.yearBuilt}
                placeholder="2005"
                onChange={(e) => set('yearBuilt', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <Switch id="prop-pool" checked={draft.hasPool} onCheckedChange={(next) => set('hasPool', next)} />
              <Label htmlFor="prop-pool">Has a pool</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="prop-hoa" checked={draft.hasHoa} onCheckedChange={(next) => set('hasHoa', next)} />
              <Label htmlFor="prop-hoa">In an association</Label>
            </div>
          </div>

          {draft.hasHoa && (
            <div>
              <Label htmlFor="prop-hoa-name">Association name</Label>
              <Input
                id="prop-hoa-name"
                value={draft.hoaName}
                placeholder="Estancia at Wiregrass Ranch"
                onChange={(e) => set('hoaName', e.target.value)}
              />
            </div>
          )}

          {/*
            The landlord lives on the property, not on each lease. None of it
            changes between tenancies, and it was being re-typed every time —
            along with the §83.50 notice details, which are equally stable.

            Copied into a lease at creation, never referenced live: a lease
            that read its signers from here would have them silently rewritten
            when this form was next edited.
          */}
          <div className="border-t pt-5">
            <h3 className="font-medium">Who signs as landlord</h3>
            <p className="mt-0.5 text-muted-foreground text-xs">
              Pre-filled on every lease written against this property. You can still change it per lease.
            </p>

            <div className="mt-3 space-y-3">
              {draft.landlords.map((landlord, index) => (
                // Index as key: rows have no id and are never reordered.
                <div key={index} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <Input
                    aria-label={`Landlord ${index + 1} name`}
                    value={landlord.name}
                    placeholder="Full legal name"
                    onChange={(e) =>
                      set(
                        'landlords',
                        draft.landlords.map((l, i) => (i === index ? { ...l, name: e.target.value } : l)),
                      )
                    }
                  />
                  <Input
                    aria-label={`Landlord ${index + 1} email`}
                    type="email"
                    value={landlord.email}
                    placeholder="Email for signing"
                    onChange={(e) =>
                      set(
                        'landlords',
                        draft.landlords.map((l, i) => (i === index ? { ...l, email: e.target.value } : l)),
                      )
                    }
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Remove this landlord"
                    disabled={draft.landlords.length === 1}
                    onClick={() =>
                      set(
                        'landlords',
                        draft.landlords.filter((_, i) => i !== index),
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => set('landlords', [...draft.landlords, { name: '', email: '' }])}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add another landlord
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="prop-notice-name">Who receives notices for the landlord?</Label>
              <p className="mt-0.5 mb-1.5 text-muted-foreground text-xs">
                Fla. Stat. §83.50 — the lease must name the landlord, or whoever is authorised to receive notices.
              </p>
              <Input
                id="prop-notice-name"
                value={draft.noticeName}
                onChange={(e) => set('noticeName', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="prop-notice-address">At what address?</Label>
              <p className="mt-0.5 mb-1.5 text-muted-foreground text-xs">§83.50 — must be given in writing.</p>
              <Input
                id="prop-notice-address"
                value={draft.noticeAddress}
                onChange={(e) => set('noticeAddress', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="prop-appliances">Appliances included</Label>
            <p className="mt-0.5 mb-1.5 text-muted-foreground text-xs">
              Listed in the lease as provided with the property. Plain prose — it is printed as written.
            </p>
            <Textarea
              id="prop-appliances"
              rows={2}
              value={draft.includedAppliances}
              placeholder="refrigerator, oven and range, microwave, dishwasher, clothes washer and clothes dryer"
              onChange={(e) => set('includedAppliances', e.target.value)}
            />
          </div>

          {create.error && <p className="font-medium text-destructive text-sm">{create.error.message}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 border-t pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            disabled={!canSubmit || saving}
            onClick={() => {
              const fields = {
                organisationId,
                label: draft.label.trim(),
                addressLine: draft.addressLine.trim(),
                city: draft.city.trim(),
                state: draft.state.trim(),
                postalCode: draft.postalCode.trim(),
                county: draft.county.trim(),
                propertyType: draft.propertyType,
                // Blank means unknown, which is a real answer here — it makes
                // the lead-paint disclosure unconditional.
                yearBuilt: draft.yearBuilt.trim() === '' ? null : Number(draft.yearBuilt),
                hasPool: draft.hasPool,
                hasHoa: draft.hasHoa,
                hoaName: draft.hasHoa && draft.hoaName.trim() !== '' ? draft.hoaName.trim() : null,
                includedAppliances: draft.includedAppliances.trim() === '' ? null : draft.includedAppliances.trim(),
                // Blank rows are dropped rather than saved as a nameless signer.
                landlords: draft.landlords
                  .filter((l) => l.name.trim() !== '')
                  .map((l) => ({ name: l.name.trim(), email: l.email.trim() })),
                noticeName: draft.noticeName.trim() === '' ? null : draft.noticeName.trim(),
                noticeAddress: draft.noticeAddress.trim() === '' ? null : draft.noticeAddress.trim(),
              };

              if (existing) {
                update.mutate({ ...fields, id: existing.id });
              } else {
                create.mutate(fields);
              }
            }}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : existing ? (
              'Save changes'
            ) : (
              'Add property'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
