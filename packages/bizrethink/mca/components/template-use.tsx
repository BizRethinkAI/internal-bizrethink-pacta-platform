import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@documenso/ui/primitives/form/form';
import { Input } from '@documenso/ui/primitives/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useId, useState } from 'react';
import { type FieldPath, useFieldArray, useForm, useFormContext } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';

import type { McaTemplateSnapshot } from '../templates/compile';
import { mcaDraftControls } from '../transactions/fill';
import { emptyMcaDraftInput, type McaDraftInput, ZMcaDraftInput } from '../transactions/input';

export const McaTemplateUseWorkspace = ({ teamId, teamUrl }: { teamId: number; teamUrl: string }) => {
  const [search] = useSearchParams();
  const id = search.get('template') ?? '';
  const version = Number(search.get('revision') ?? 1);
  const template = trpc.bizrethink.mcaTemplates.preview.useQuery(
    { teamId, id, version },
    { enabled: Boolean(id) && Number.isInteger(version) && version > 0, retry: false, refetchOnWindowFocus: false },
  );
  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <Link className="text-sm underline" to={`/t/${teamUrl}/mca${id ? `?template=${encodeURIComponent(id)}` : ''}`}>
        <Trans>Back to provider templates</Trans>
      </Link>
      <h1 className="font-semibold text-2xl">
        <Trans>Prepare an MCA transaction draft</Trans>
      </h1>
      <p className="text-muted-foreground">
        <Trans>
          Enter this transaction's facts. Provider policy stays with the saved template. This workspace produces
          internal review copies with blank signature locations.
        </Trans>
      </p>
      {template.error && <p role="alert">{template.error.message}</p>}
      {template.isLoading && (
        <p>
          <Trans>Loading the selected template…</Trans>
        </p>
      )}
      {!id && (
        <p>
          <Trans>Select a saved provider template first.</Trans>
        </p>
      )}
      {template.data &&
        (template.data.currentRevision !== version ? (
          <p role="alert">
            <Trans>Choose the latest provider revision before starting a new transaction.</Trans>
          </p>
        ) : (
          <McaDraftInterview
            key={`${id}:${version}`}
            teamId={teamId}
            templateId={id}
            version={version}
            template={template.data}
          />
        ))}
    </div>
  );
};

const McaDraftInterview = ({
  teamId,
  templateId,
  version,
  template,
}: {
  teamId: number;
  templateId: string;
  version: number;
  template: McaTemplateSnapshot;
}) => {
  const form = useForm<McaDraftInput>({ resolver: zodResolver(ZMcaDraftInput), defaultValues: emptyMcaDraftInput() });
  const preview = trpc.bizrethink.mcaTemplates.fill.useMutation();
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [previewInput, setPreviewInput] = useState<string | null>(null);
  const watched = form.watch();
  const normalized = ZMcaDraftInput.safeParse(watched);
  const isPreviewCurrent = normalized.success && previewInput === JSON.stringify(normalized.data);
  const controls = mcaDraftControls(template);
  const currentEquipment = watched.equipmentElection;
  const hasEquipment = currentEquipment === 'lease' || currentEquipment === 'subscription';
  const equipmentInstrument = currentEquipment === 'lease' ? 'equipment-lease' : 'subscription';
  const fieldId = useId();
  const refresh = form.handleSubmit(
    async (draft) => {
      setError(null);
      try {
        await preview.mutateAsync({ teamId, id: templateId, version, draft });
        setPreviewInput(JSON.stringify(draft));
      } catch (cause) {
        setError(AppError.parseError(cause).message);
      }
    },
    () => setError(t`Correct the highlighted draft inputs.`),
  );
  const download = async () => {
    setDownloading(true);
    setError(null);
    try {
      const draft = ZMcaDraftInput.parse(form.getValues());
      const response = await fetch('/api/bizrethink/mca-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, id: templateId, version, draft }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new AppError(AppErrorCode.INVALID_REQUEST, { message: body.message ?? t`Draft export failed.` });
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'mca-internal-draft.pdf';
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (cause) {
      setError(AppError.parseError(cause).message);
    } finally {
      setDownloading(false);
    }
  };
  return (
    <Form {...form}>
      <form onSubmit={refresh} className="space-y-5">
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950 text-sm">
          <Trans>
            Internal draft. Inputs on this page are not saved; downloading creates a review copy only. Disclosures,
            processor acceptance, approvals and actual signatures remain separate requirements.
          </Trans>
        </div>
        <fieldset disabled={preview.isPending || downloading} className="space-y-5 disabled:opacity-70">
          <DraftText name="reference" label={t`Transaction reference`} />
          {template.profile.policy.equipment !== 'none' && (
            <FormField
              control={form.control}
              name="equipmentElection"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Trans>Merchant's equipment election</Trans>
                  </FormLabel>
                  <FormControl>
                    <select
                      className="h-10 w-full rounded border bg-background px-3"
                      {...field}
                      onChange={(event) => {
                        field.onChange(event.target.value);
                        form.setValue('guarantors.equipment-lease', []);
                        form.setValue('guarantors.subscription', []);
                        form.setValue(
                          'values',
                          Object.fromEntries(
                            Object.entries(form.getValues('values')).filter(
                              ([binding]) => !binding.startsWith('equipment.'),
                            ),
                          ),
                        );
                      }}
                    >
                      <option value="none">
                        <Trans>No equipment</Trans>
                      </option>
                      <option value="cash-purchase">
                        <Trans>Cash purchase — separate sale agreement required</Trans>
                      </option>
                      <option value="lease">
                        <Trans>Fixed-term equipment lease</Trans>
                      </option>
                      <option value="subscription">
                        <Trans>Monthly equipment subscription</Trans>
                      </option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {template.profile.policy.brokerChannel && (
            <FormField
              control={form.control}
              name="includeChannelAgreement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex gap-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(event) => field.onChange(event.target.checked)}
                      />
                    </FormControl>
                    <Trans>Also prepare the separate ISO channel agreement</Trans>
                  </FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <section className="space-y-4 rounded-lg border p-4">
            <h2 className="font-semibold text-lg">
              <Trans>Transaction values</Trans>
            </h2>
            <p className="text-muted-foreground text-sm">
              <Trans>
                Supply amounts from the financing system and the relevant disclosure calculation. Purchase price,
                purchased receipts, equipment charges and finance charge are separate values. Use a masked account
                identifier; do not enter a full personal SSN.
              </Trans>
            </p>
            <FormField
              control={form.control}
              name="values"
              render={({ field }) => (
                <FormItem>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {controls
                      .filter((control) => {
                        if (control.instrument === 'equipment-lease' || control.instrument === 'subscription') {
                          return hasEquipment && control.instrument === equipmentInstrument;
                        }
                        if (control.instrument === 'iso-pra') {
                          return watched.includeChannelAgreement;
                        }
                        return true;
                      })
                      .map((control) => (
                        <div key={control.binding} className="space-y-1">
                          <label htmlFor={`${fieldId}-${control.binding}`} className="font-medium text-sm">
                            {control.label}
                            {control.required ? ' *' : ''}
                          </label>
                          <Input
                            id={`${fieldId}-${control.binding}`}
                            type={control.kind === 'date' ? 'date' : 'text'}
                            inputMode={control.kind === 'currency' ? 'decimal' : undefined}
                            value={field.value[control.binding] ?? ''}
                            onChange={(event) =>
                              field.onChange({ ...field.value, [control.binding]: event.target.value })
                            }
                          />
                        </div>
                      ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>
          <section className="space-y-4 rounded-lg border p-4">
            <h2 className="font-semibold text-lg">
              <Trans>Intended signing capacities</Trans>
            </h2>
            <p className="text-muted-foreground text-sm">
              <Trans>
                Identify who will sign in each role. Nothing entered here is a signature or an authorization.
              </Trans>
            </p>
            <SignerInputs role="merchant" label={t`Merchant representative`} />
            <SignerInputs role="buyer" label={t`Receivables buyer representative`} />
            {hasEquipment && <SignerInputs role="equipmentProvider" label={t`Equipment provider representative`} />}
            {watched.includeChannelAgreement && (
              <>
                <SignerInputs role="isoCompany" label={t`ISO company representative`} />
                <SignerInputs role="isoPartner" label={t`ISO partner representative`} />
              </>
            )}
          </section>
          {template.profile.policy.guarantyScope !== 'none' && (
            <GuarantorInputs instrument="frpa" label={t`FRPA guarantors`} />
          )}
          {hasEquipment && (
            <GuarantorInputs
              key={equipmentInstrument}
              instrument={equipmentInstrument}
              label={t`Separate equipment guarantors`}
            />
          )}
          {template.profile.policy.consumerReportPulled && <ReportSubjects />}
        </fieldset>
        <Button type="submit" disabled={preview.isPending || downloading}>
          <Trans>Preview filled draft</Trans>
        </Button>
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        {preview.data && (
          <section className="space-y-4 rounded-lg border p-4" data-mca-filled-preview>
            <h2 className="font-semibold text-lg">
              <Trans>Internal transaction draft</Trans>
            </h2>
            {!isPreviewCurrent && (
              <p role="alert">
                <Trans>Inputs changed. Refresh the preview before downloading.</Trans>
              </p>
            )}
            <p className="text-muted-foreground text-sm">
              <Trans>
                Required inputs still blank: {preview.data.missing.length}. A completed input form still needs the
                package checks below.
              </Trans>
            </p>
            <ul className="list-disc space-y-2 pl-5 text-sm">
              {preview.data.blockers.map((blocker) => (
                <li key={blocker.kind}>{blocker.detail}</li>
              ))}
            </ul>
            <details>
              <summary className="cursor-pointer font-medium">
                <Trans>Missing inputs</Trans>
              </summary>
              <ul className="space-y-1 text-sm">
                {preview.data.missing.map((entry, index) => (
                  <li key={`${entry.document}-${entry.binding}-${index}`}>
                    {entry.document}: {entry.label}
                  </li>
                ))}
              </ul>
            </details>
            {preview.data.documents.map((document) => (
              <details key={document.id} className="rounded border p-3">
                <summary className="cursor-pointer font-medium">{document.title}</summary>
                <div className="mt-4 space-y-5">
                  {document.items.map((item) => (
                    <article key={item.slug}>
                      <h3 className="font-semibold">
                        {item.number ? `${item.number} ` : ''}
                        {item.heading}
                      </h3>
                      <p className="whitespace-pre-wrap text-sm">{item.body}</p>
                      {item.fields.length > 0 && (
                        <dl className="mt-2 space-y-1 text-sm">
                          {item.fields
                            .filter((field) => field.kind !== 'signature' && !field.binding.endsWith('.signedDate'))
                            .map((field) => (
                              <div key={field.widget}>
                                <dt className="text-muted-foreground">{field.label}</dt>
                                <dd>{field.value || '—'}</dd>
                              </div>
                            ))}
                        </dl>
                      )}
                    </article>
                  ))}
                  <h3 className="font-semibold">
                    <Trans>Separate unsigned execution locations</Trans>
                  </h3>
                  {document.signatures.map((signature, index) => (
                    <p key={`${signature.role}-${index}`} className="text-sm">
                      {signature.role}: {signature.partyName} — {signature.signerName} ({signature.capacity})
                    </p>
                  ))}
                </div>
              </details>
            ))}
            <Button type="button" disabled={!isPreviewCurrent || downloading} onClick={() => void download()}>
              <Trans>Download internal draft PDF</Trans>
            </Button>
          </section>
        )}
      </form>
    </Form>
  );
};

const DraftText = ({ name, label }: { name: FieldPath<McaDraftInput>; label: string }) => {
  const { control } = useFormContext<McaDraftInput>();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={typeof field.value === 'string' ? field.value : ''}
              onChange={field.onChange}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
const SignerInputs = ({ role, label }: { role: keyof McaDraftInput['signers']; label: string }) => (
  <fieldset className="space-y-3 rounded border p-3">
    <legend className="px-1 font-medium">{label}</legend>
    <div className="grid gap-3 sm:grid-cols-3">
      <DraftText name={`signers.${role}.name`} label={t`Printed signer name`} />
      <DraftText name={`signers.${role}.capacity`} label={t`Signing capacity`} />
      <DraftText name={`signers.${role}.email`} label={t`Signer email`} />
    </div>
  </fieldset>
);
const GuarantorInputs = ({ instrument, label }: { instrument: keyof McaDraftInput['guarantors']; label: string }) => {
  const { control, watch } = useFormContext<McaDraftInput>();
  const { fields, append, remove } = useFieldArray({ control, name: `guarantors.${instrument}` });
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h2 className="font-semibold text-lg">{label}</h2>
      {fields.map((entry, index) => (
        <fieldset key={entry.id} className="space-y-3 rounded border p-3">
          <legend>
            <Trans>Guarantor {index + 1}</Trans>
          </legend>
          <FormField
            control={control}
            name={`guarantors.${instrument}.${index}.kind`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <Trans>Guarantor type</Trans>
                </FormLabel>
                <FormControl>
                  <select className="h-10 w-full rounded border bg-background px-3" {...field}>
                    <option value="individual">
                      <Trans>Individual</Trans>
                    </option>
                    <option value="entity">
                      <Trans>Entity</Trans>
                    </option>
                  </select>
                </FormControl>
              </FormItem>
            )}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <DraftText name={`guarantors.${instrument}.${index}.legalName`} label={t`Guarantor legal name`} />
            <DraftText name={`guarantors.${instrument}.${index}.noticeAddress`} label={t`Guarantor notice address`} />
            <DraftText name={`guarantors.${instrument}.${index}.email`} label={t`Guarantor email`} />
            <DraftText name={`guarantors.${instrument}.${index}.phone`} label={t`Guarantor phone`} />
            {watch(`guarantors.${instrument}.${index}.kind`) === 'entity' && (
              <>
                <DraftText
                  name={`guarantors.${instrument}.${index}.signerName`}
                  label={t`Entity guarantor representative`}
                />
                <DraftText
                  name={`guarantors.${instrument}.${index}.signerCapacity`}
                  label={t`Entity guarantor signing capacity`}
                />
              </>
            )}
          </div>
          <Button type="button" variant="outline" onClick={() => remove(index)}>
            <Trans>Remove guarantor</Trans>
          </Button>
        </fieldset>
      ))}
      <Button
        type="button"
        variant="outline"
        disabled={fields.length >= 10}
        onClick={() =>
          append({
            kind: 'individual',
            legalName: '',
            noticeAddress: '',
            phone: '',
            email: '',
            signerName: '',
            signerCapacity: '',
          })
        }
      >
        <Trans>Add guarantor</Trans>
      </Button>
    </section>
  );
};
const ReportSubjects = () => {
  const { control } = useFormContext<McaDraftInput>();
  const { fields, append, remove } = useFieldArray({ control, name: 'reportSubjects' });
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h2 className="font-semibold text-lg">
        <Trans>Individual report instructions</Trans>
      </h2>
      <p className="text-muted-foreground text-sm">
        <Trans>
          Add a person only when preparing that person's separate instructions. No report is obtained or authorized
          here.
        </Trans>
      </p>
      {fields.map((entry, index) => (
        <fieldset key={entry.id} className="space-y-3 rounded border p-3">
          <legend>
            <Trans>Report subject {index + 1}</Trans>
          </legend>
          <DraftText name={`reportSubjects.${index}.name`} label={t`Individual report subject name`} />
          <DraftText name={`reportSubjects.${index}.reportingAgency`} label={t`Consumer reporting agency`} />
          <Button type="button" variant="outline" onClick={() => remove(index)}>
            <Trans>Remove report subject</Trans>
          </Button>
        </fieldset>
      ))}
      <Button
        type="button"
        variant="outline"
        disabled={fields.length >= 10}
        onClick={() => append({ name: '', reportingAgency: '' })}
      >
        <Trans>Add individual report subject</Trans>
      </Button>
    </section>
  );
};
