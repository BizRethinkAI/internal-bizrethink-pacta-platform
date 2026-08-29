import type { LeasePartyInput } from '@bizrethink/customizations/lease/parties/derive-parties';
import { validateParties } from '@bizrethink/customizations/lease/parties/derive-parties';
import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Button } from '@documenso/ui/primitives/button';
import { Input } from '@documenso/ui/primitives/input';
import { Label } from '@documenso/ui/primitives/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@documenso/ui/primitives/select';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';

/**
 * Who signs.
 *
 * The list this edits was, until now, absent from the product entirely. The
 * opening clause of every lease reads "between {{landlordNames}} and
 * {{tenantNames}}" and both are required variables, but they sit in
 * DERIVED_VALUES — nobody types them — and nothing derived them. Every real
 * lease therefore reported two permanently missing variables, which is why the
 * Send button could never become enabled.
 *
 * ORDER MATTERS AND IS NOT COSMETIC. Signature placeholders are numbered
 * positionally across this list (`r1`, `r2`, …) and upstream resolves them back
 * by index, so the order shown here is the order signatures attach in. It is
 * why rows are added at the end and there is no sort.
 */

export type PartyEditorProps = {
  parties: LeasePartyInput[];
  onChange: (parties: LeasePartyInput[]) => void;
};

export const PartyEditor = ({ parties, onChange }: PartyEditorProps) => {
  const update = (index: number, patch: Partial<LeasePartyInput>) => {
    onChange(parties.map((party, i) => (i === index ? { ...party, ...patch } : party)));
  };

  const add = (role: LeasePartyInput['role']) => {
    onChange([...parties, { name: '', role, email: '' }]);
  };

  /*
    Shown live rather than on submit. Two of these findings — a duplicated name
    and a duplicated email — describe failures that are completely silent at
    signing time: the envelope creates cleanly and one person receives someone
    else's signing link. Surfacing them only after the send would be surfacing
    them after the damage.
  */
  const findings = parties.length > 0 ? validateParties(parties) : [];

  return (
    <div className="mt-4 space-y-4">
      {parties.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
          Nobody is signing yet. Add each landlord and each tenant — every person here gets their own signature block on
          the lease and on every addendum.
        </p>
      )}

      {parties.map((party, index) => (
        // Index as key: rows have no id, and reordering is deliberately not offered.
        <div key={index} className="rounded-lg border p-4">
          <div className="flex items-start gap-4">
            <div className="grid flex-1 gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor={`party-name-${index}`}>Full legal name</Label>
                <p className="mt-0.5 mb-1.5 text-muted-foreground text-xs">Printed above their signature line.</p>
                <Input
                  id={`party-name-${index}`}
                  value={party.name}
                  placeholder="Christopher Keane"
                  onChange={(e) => update(index, { name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor={`party-role-${index}`}>Signing as</Label>
                <p className="mt-0.5 mb-1.5 text-muted-foreground text-xs">Decides which block they sign in.</p>
                <Select
                  value={party.role}
                  onValueChange={(next) => update(index, { role: next as LeasePartyInput['role'] })}
                >
                  <SelectTrigger id={`party-role-${index}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="landlord">Landlord</SelectItem>
                    <SelectItem value="tenant">Tenant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor={`party-email-${index}`}>Email</Label>
                <p className="mt-0.5 mb-1.5 text-muted-foreground text-xs">
                  Where their signing link goes. Not printed in the lease.
                </p>
                <Input
                  id={`party-email-${index}`}
                  type="email"
                  value={party.email}
                  placeholder="chris@example.com"
                  onChange={(e) => update(index, { email: e.target.value })}
                />
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="mt-6"
              onClick={() => onChange(parties.filter((_, i) => i !== index))}
              aria-label={`Remove ${party.name || 'this signer'}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => add('landlord')}>
          <Plus className="mr-2 h-4 w-4" />
          Add a landlord
        </Button>
        <Button variant="outline" onClick={() => add('tenant')}>
          <Plus className="mr-2 h-4 w-4" />
          Add a tenant
        </Button>
      </div>

      {findings.length > 0 && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>This list cannot be sent yet</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
              {findings.map((finding) => (
                <li key={finding}>{finding}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
