import { FormField, FormItem, FormMessage } from '@documenso/ui/primitives/form/form';
import type { MessageDescriptor } from '@lingui/core';
import { useLingui } from '@lingui/react';
import type { FieldPath, FieldValues } from 'react-hook-form';
import { useFormContext } from 'react-hook-form';

import type { McaAnswerConsequence } from '../entities/consequences';
import { McaConsequenceList } from './answer-consequence';

/**
 * One question of the interview: what is being asked, what it means, and what
 * each answer would do to the documents.
 *
 * RADIOS RATHER THAN A DROPDOWN, because a dropdown hides the alternatives and
 * the alternatives are the whole point — a funder deciding about a guaranty
 * should see what choosing differently would change without having to try it.
 *
 * The consequence under each option is DERIVED from the same clause selection
 * the compiler runs (`answerConsequences`). Nothing here is a written claim
 * about the document, so nothing here can drift from it. It observes; it does
 * not recommend.
 */
export const McaChoice = <T extends FieldValues>({
  name,
  label,
  explain,
  options,
  consequences,
}: {
  name: FieldPath<T>;
  label: MessageDescriptor;
  /** What the question means, in plain language. Never what to answer. */
  explain?: MessageDescriptor;
  options: [string, MessageDescriptor][];
  consequences: McaAnswerConsequence[];
}) => {
  const { _ } = useLingui();
  const { control } = useFormContext<T>();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const chosen = typeof field.value === 'boolean' ? String(field.value) : String(field.value ?? '');

        return (
          <FormItem>
            <fieldset className="space-y-3" data-mca-question={name}>
              <legend className="font-medium">{_(label)}</legend>
              {explain && <p className="text-muted-foreground text-sm">{_(explain)}</p>}

              <div className="space-y-2">
                {options.map(([value, text]) => {
                  const selected = chosen === value;

                  return (
                    <label
                      key={value}
                      className={`block cursor-pointer rounded-lg border p-3 ${selected ? 'border-foreground bg-muted/40' : ''}`}
                    >
                      <span className="flex items-start gap-2">
                        <input
                          type="radio"
                          className="mt-1 h-4 w-4"
                          name={field.name}
                          value={value}
                          checked={selected}
                          onBlur={field.onBlur}
                          onChange={() => field.onChange(value === 'true' ? true : value === 'false' ? false : value)}
                        />
                        <span className="min-w-0 space-y-2">
                          <span className="block font-medium text-sm">{_(text)}</span>
                          {/*
                            Only for the options NOT chosen. The chosen one
                            changes nothing by definition, and a row of "no
                            change" is noise that hides the row that matters.
                          */}
                          {!selected && (
                            <McaConsequenceList
                              consequence={consequences.find((entry) => entry.field === name && entry.option === value)}
                            />
                          )}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};

/**
 * A yes/no question, which is the same control with the answers named.
 *
 * Kept distinct so the wording can be the question's own — "does this entity
 * take business through brokers?" reads better as Yes/No than as a pair of
 * restated sentences.
 */
export const McaYesNo = <T extends FieldValues>({
  name,
  label,
  explain,
  yes,
  no,
  consequences,
}: {
  name: FieldPath<T>;
  label: MessageDescriptor;
  explain?: MessageDescriptor;
  yes: MessageDescriptor;
  no: MessageDescriptor;
  consequences: McaAnswerConsequence[];
}) => (
  <McaChoice
    name={name}
    label={label}
    explain={explain}
    options={[
      ['true', yes],
      ['false', no],
    ]}
    consequences={consequences}
  />
);
