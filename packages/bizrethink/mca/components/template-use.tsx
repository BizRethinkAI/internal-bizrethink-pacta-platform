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
import { focusReadingItem, LegalWorkspace } from '../../legal-ui/reader';
import { subjectLabel } from '../../legal-ui/reading';
import type { McaTemplateSnapshot } from '../templates/compile';
import { mcaDraftControls } from '../transactions/fill';
import { emptyMcaDraftInput, type McaDraftInput, ZMcaDraftInput } from '../transactions/input';
import { McaPackageReader } from './package-reader';

export const McaTemplateUseWorkspace = ({ teamId, teamUrl }: { teamId: number; teamUrl: string }) => {
  const [search] = useSearchParams();
  const id = search.get('template') ?? '';
  const version = Number(search.get('revision') ?? 1);
  const template = trpc.bizrethink.mcaTemplates.preview.useQuery(
    { teamId, id, version },
    { enabled: Boolean(id) && Number.isInteger(version) && version > 0, retry: false, refetchOnWindowFocus: false },
  );
  return (
    <LegalWorkspace>
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
    </LegalWorkspace>
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
  const saveDeal = trpc.bizrethink.mcaTemplates.saveDeal.useMutation();
  const openDeal = trpc.bizrethink.mcaTemplates.openDeal.useMutation();
  const deleteDeal = trpc.bizrethink.mcaTemplates.deleteDeal.useMutation();
  const deals = trpc.bizrethink.mcaTemplates.listDeals.useQuery({ teamId });
  // The saved deal this form is editing, and the version it was loaded at: a
  // save carries that version so a second editor is a conflict, not a
  // last-write. ADR 0022.
  const [saved, setSaved] = useState<{ id: string; version: number } | null>(null);
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
  const _fieldId = useId();
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
  const save = form.handleSubmit(
    async (draft) => {
      setError(null);
      try {
        const label = draft.values['merchant.legalName']?.trim() || draft.reference || t`Untitled deal`;
        const result = await saveDeal.mutateAsync({
          teamId,
          templateId,
          label,
          input: draft,
          ...(saved ? { id: saved.id, expectedVersion: saved.version } : {}),
        });
        setSaved({ id: result.id, version: result.version });
        await deals.refetch();
      } catch (cause) {
        setError(AppError.parseError(cause).message);
      }
    },
    () => setError(t`Correct the highlighted draft inputs before saving.`),
  );
  const resume = async (id: string) => {
    setError(null);
    try {
      const opened = await openDeal.mutateAsync({ teamId, id });
      form.reset(opened.input);
      setSaved({ id: opened.id, version: opened.version });
      setPreviewInput(null);
    } catch (cause) {
      setError(AppError.parseError(cause).message);
    }
  };
  const discard = async (id: string) => {
    setError(null);
    try {
      await deleteDeal.mutateAsync({ teamId, id });
      if (saved?.id === id) {
        setSaved(null);
      }
      await deals.refetch();
    } catch (cause) {
      setError(AppError.parseError(cause).message);
    }
  };
  return (
    <Form {...form}>
      <form onSubmit={refresh} className="space-y-5">
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950 text-sm">
          <Trans>
            Internal draft. A saved deal keeps the answers only and recompiles the documents when reopened; downloading
            creates a review copy. Disclosures, processor acceptance, approvals and actual signatures remain separate
            requirements.
          </Trans>
        </div>
        <section data-mca-saved-deals className="space-y-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-lg">
              <Trans>Saved deals</Trans>
            </h2>
            <Button type="button" variant="outline" onClick={save} disabled={saveDeal.isPending}>
              {saved ? <Trans>Save changes</Trans> : <Trans>Save this deal</Trans>}
            </Button>
          </div>
          <p className="text-muted-foreground text-sm">
            <Trans>
              A saved deal holds the answers on this page, not the assembled documents. Deleting one removes it.
            </Trans>
          </p>
          {deals.data?.length ? (
            <ul className="space-y-2">
              {deals.data.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-3">
                  <span className="text-sm">
                    {entry.label}
                    {saved?.id === entry.id ? <Trans> — editing</Trans> : null}
                  </span>
                  <span className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => resume(entry.id)}>
                      <Trans>Open</Trans>
                    </Button>
                    <Button type="button" variant="outline" onClick={() => discard(entry.id)}>
                      <Trans>Delete</Trans>
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              <Trans>No saved deals yet.</Trans>
            </p>
          )}
        </section>
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
                        <div key={control.binding} className="space-y-1 rounded-md border bg-background p-3">
                          <p className="mb-2 text-muted-foreground text-xs uppercase tracking-wide">
                            {subjectLabel(control.binding.split('.')[0])}
                          </p>
                          <label htmlFor={`draft-input-values.${control.binding}`} className="font-medium text-sm">
                            {control.label}
                            {control.required ? ' *' : ''}
                          </label>
                          <Input
                            id={`draft-input-values.${control.binding}`}
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
            <SignerInputs signerRole="merchant" label={t`Merchant representative`} />
            <SignerInputs signerRole="buyer" label={t`Receivables buyer representative`} />
            {hasEquipment && (
              <SignerInputs signerRole="equipmentProvider" label={t`Equipment provider representative`} />
            )}
            {watched.includeChannelAgreement && (
              <>
                <SignerInputs signerRole="isoCompany" label={t`ISO company representative`} />
                <SignerInputs signerRole="isoPartner" label={t`ISO partner representative`} />
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
                    <button
                      type="button"
                      className="text-left text-primary underline underline-offset-4"
                      onClick={() => focusReadingItem(`draft-input-${entry.inputPath}`)}
                    >
                      {entry.document}: {entry.label}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
            <McaPackageReader documents={preview.data.documents} />
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
          <FormLabel htmlFor={`draft-input-${name}`}>{label}</FormLabel>
          <FormControl>
            <Input
              id={`draft-input-${name}`}
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
const SignerInputs = ({ signerRole: role, label }: { signerRole: keyof McaDraftInput['signers']; label: string }) => (
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
        id={`draft-input-guarantors.${instrument}`}
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
