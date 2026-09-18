import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@documenso/ui/primitives/form/form';
import { Input } from '@documenso/ui/primitives/input';
import type { MessageDescriptor } from '@lingui/core';
import { useLingui } from '@lingui/react';
import type { FieldPath, FieldValues } from 'react-hook-form';
import { useFormContext } from 'react-hook-form';

/**
 * The three answer controls an MCA interview is built from, generic over the
 * form they belong to.
 *
 * `provider-interview.tsx` has its own copies, typed to `McaProviderProfile`.
 * They are not imported from here on purpose: that component is the profile's
 * interview and ADR 0026 retires it along with the profile, so generalising it
 * now would mean editing a file to delete it a change later. These are written
 * generically so the entity editor and whatever follows share one set.
 */

export const TextAnswer = <T extends FieldValues>({
  name,
  label,
  type = 'text',
  hint,
}: {
  name: FieldPath<T>;
  label: MessageDescriptor;
  type?: 'text' | 'email' | 'number' | 'url' | 'tel';
  hint?: MessageDescriptor;
}) => {
  const { _ } = useLingui();
  const { control } = useFormContext<T>();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{_(label)}</FormLabel>
          {hint && <p className="text-muted-foreground text-sm">{_(hint)}</p>}
          <FormControl>
            <Input
              type={type}
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={typeof field.value === 'string' || typeof field.value === 'number' ? field.value : ''}
              onChange={(event) => field.onChange(type === 'number' ? event.target.valueAsNumber : event.target.value)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export const SelectAnswer = <T extends FieldValues>({
  name,
  label,
  options,
  hint,
}: {
  name: FieldPath<T>;
  label: MessageDescriptor;
  options: [string, MessageDescriptor][];
  hint?: MessageDescriptor;
}) => {
  const { _ } = useLingui();
  const { control } = useFormContext<T>();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{_(label)}</FormLabel>
          {hint && <p className="text-muted-foreground text-sm">{_(hint)}</p>}
          <FormControl>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={typeof field.value === 'string' ? field.value : ''}
              onChange={(event) => field.onChange(event.target.value)}
            >
              {options.map(([value, text]) => (
                <option key={value} value={value}>
                  {_(text)}
                </option>
              ))}
            </select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export const CheckAnswer = <T extends FieldValues>({
  name,
  label,
  hint,
}: {
  name: FieldPath<T>;
  label: MessageDescriptor;
  hint?: MessageDescriptor;
}) => {
  const { _ } = useLingui();
  const { control } = useFormContext<T>();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-start gap-2">
            <FormControl>
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                checked={Boolean(field.value)}
                onChange={(event) => field.onChange(event.target.checked)}
              />
            </FormControl>
            <div className="min-w-0 space-y-1">
              <FormLabel>{_(label)}</FormLabel>
              {hint && <p className="text-muted-foreground text-sm">{_(hint)}</p>}
            </div>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
