import { validateCheckboxLength } from '@documenso/lib/advanced-fields-validation/validate-checkbox';
import { validateDropdownField } from '@documenso/lib/advanced-fields-validation/validate-dropdown';
import { validateNumberField } from '@documenso/lib/advanced-fields-validation/validate-number';
import { validateRadioField } from '@documenso/lib/advanced-fields-validation/validate-radio';
import { validateTextField } from '@documenso/lib/advanced-fields-validation/validate-text';
import { isBase64Image } from '@documenso/lib/constants/signatures';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import type { TCheckboxFieldMeta, TNumberFieldMeta } from '@documenso/lib/types/field-meta';
import { ZEnvelopeFieldAndMetaSchema } from '@documenso/lib/types/field-meta';
import { fromCheckboxValue } from '@documenso/lib/universal/field-checkbox';
import { isRequiredField } from '@documenso/lib/utils/advanced-fields-helpers';
import { zEmail } from '@documenso/lib/utils/zod';
import type { TSignFieldWithTokenMutationSchema } from '@documenso/trpc/server/field-router/schema';
import {
  checkboxValidationSigns,
  numberFormatValues,
} from '@documenso/ui/primitives/document-flow/field-items-advanced-settings/constants';
import type { DocumentMeta, Field } from '@prisma/client';
import { FieldType, Prisma } from '@prisma/client';

type SubmittedField = TSignFieldWithTokenMutationSchema;
type Choice = string | number;

/** Validate the entire submission before ACTION factors, file copies or writes. */
export const validateDirectTemplateFields = ({
  fields,
  submitted,
  internalVersion,
  documentMeta,
}: {
  fields: Field[];
  submitted: SubmittedField[];
  internalVersion: number;
  documentMeta: Pick<DocumentMeta, 'typedSignatureEnabled'>;
}): SubmittedField[] => {
  const byId = new Map<number, SubmittedField>();
  const fieldIds = new Set(fields.map((field) => field.id));
  for (const input of submitted) {
    // The legacy UI sends one empty id=0 placeholder for each unsigned optional field.
    if (input.fieldId === 0 && input.value === undefined) {
      continue;
    }
    if (!fieldIds.has(input.fieldId) || byId.has(input.fieldId)) {
      invalid('Invalid or duplicate direct-template field');
    }
    byId.set(input.fieldId, input);
  }

  return fields.flatMap((field): SubmittedField[] => {
    const parsed = ZEnvelopeFieldAndMetaSchema.safeParse({ type: field.type, fieldMeta: field.fieldMeta ?? undefined });
    if (!parsed.success) {
      return invalid('Invalid direct-template field configuration');
    }
    const configured = parsed.data;
    const input = byId.get(field.id);
    const required = isRequiredField(field);
    let value = input?.value?.trim() ?? '';
    let isBase64 = input?.isBase64;
    const locked = configured.fieldMeta?.readOnly === true;
    if (locked && required && configured.fieldMeta?.required) {
      invalid('A field cannot be both read-only and required');
    }
    const preserveLockedValue = (expected: string | undefined) => {
      if (expected === undefined) {
        return invalid('A read-only field must have a configured default');
      }
      // The public request schema trims strings. Persist the publisher's exact
      // default even when that transport normalization removed surrounding space.
      if (input?.value !== undefined && value !== expected.trim()) {
        invalid('Read-only fields cannot be changed');
      }
      value = expected;
    };

    switch (configured.type) {
      case FieldType.TEXT: {
        const meta = configured.fieldMeta;
        if (locked) {
          preserveLockedValue(meta.text);
        }
        assertValid(validateTextField(value, { ...meta, readOnly: false }, true));
        break;
      }
      case FieldType.NUMBER: {
        const meta = configured.fieldMeta;
        if (locked) {
          preserveLockedValue(meta.value);
        }
        if (value !== '') {
          validateNumber(value, meta);
        }
        break;
      }
      case FieldType.DROPDOWN: {
        const meta = configured.fieldMeta;
        if (locked) {
          preserveLockedValue(meta.defaultValue);
        }
        if (value !== '' && !meta.values?.some((option) => option.value === value)) {
          invalid('Invalid dropdown choice');
        }
        assertValid(validateDropdownField(value, { ...meta, readOnly: false }, true));
        break;
      }
      case FieldType.RADIO:
      case FieldType.CHECKBOX: {
        const meta = configured.fieldMeta;
        const allowed: Choice[] = (meta.values ?? []).map((option, index) =>
          internalVersion === 2 ? index : option.value || `empty-value-${option.id}`,
        );
        const selected = parseChoices(value, configured.type, internalVersion);
        if (selected.some((choice) => !allowed.includes(choice)) || new Set(selected).size !== selected.length) {
          invalid('Invalid field choices');
        }
        if (locked) {
          const defaults = (meta.values ?? []).flatMap((option, index) => (option.checked ? [allowed[index]] : []));
          if (
            input?.value !== undefined &&
            (selected.length !== defaults.length || selected.some((choice) => !defaults.includes(choice)))
          ) {
            invalid('Read-only fields cannot be changed');
          }
          selected.splice(0, selected.length, ...defaults);
        }
        if (configured.type === FieldType.RADIO) {
          assertValid(
            validateRadioField(
              selected.length ? String(selected[0]) : '',
              { ...configured.fieldMeta, readOnly: false },
              true,
            ),
          );
          value = selected.length ? String(selected[0]) : '';
        } else {
          validateCheckboxSelection(selected, configured.fieldMeta, required);
          value = selected.length ? JSON.stringify(selected) : '';
        }
        break;
      }
      case FieldType.SIGNATURE:
      case FieldType.FREE_SIGNATURE: {
        if (locked) {
          invalid('Signature fields cannot be read-only');
        }
        isBase64 = isBase64Image(value);
        if ((input?.isBase64 === true && !isBase64) || (documentMeta.typedSignatureEnabled === false && !isBase64)) {
          invalid('Typed signatures are not allowed or the signature image is invalid');
        }
        break;
      }
      case FieldType.EMAIL: {
        if (value !== '' && !zEmail().safeParse(value).success) {
          invalid('Invalid email field');
        }
        break;
      }
      // Ordinary signing derives DATE server-side and treats these identity
      // fields as auto-signable. Keep those existing semantics.
      case FieldType.DATE:
      case FieldType.NAME:
      case FieldType.INITIALS:
        break;
    }
    const isServerDerivedDate = configured.type === FieldType.DATE && input !== undefined;
    if (required && value.trim() === '' && !isServerDerivedDate) {
      invalid('Required field values are missing');
    }
    if (!input && !locked) {
      return [];
    }
    return [{ ...input, token: input?.token ?? '', fieldId: field.id, value, isBase64 }];
  });
};

const invalid = (message: string): never => {
  throw new AppError(AppErrorCode.INVALID_BODY, { message });
};
const assertValid = (errors: string[]) => {
  if (errors.length > 0) {
    invalid(errors.join('; '));
  }
};

const parseChoices = (
  value: string,
  type: typeof FieldType.RADIO | typeof FieldType.CHECKBOX,
  version: number,
): Choice[] => {
  if (value === '') {
    return [];
  }
  if (type === FieldType.RADIO) {
    if (version !== 2) {
      return [value];
    }
    if (!/^(0|[1-9]\d*)$/.test(value) || !Number.isSafeInteger(Number(value))) {
      return invalid('Invalid radio choice');
    }
    return [Number(value)];
  }
  let choices: unknown;
  try {
    choices = version === 2 ? JSON.parse(value) : fromCheckboxValue(value);
  } catch {
    return invalid('Invalid checkbox choices');
  }
  if (
    !Array.isArray(choices) ||
    choices.some((choice: unknown) =>
      version === 2
        ? typeof choice !== 'number' || !Number.isSafeInteger(choice) || choice < 0
        : typeof choice !== 'string',
    )
  ) {
    return invalid('Invalid checkbox choices');
  }
  return choices;
};

const validateCheckboxSelection = (selected: Choice[], meta: TCheckboxFieldMeta, required: boolean) => {
  if (required && selected.length === 0) {
    invalid('Required checkbox choices are missing');
  }
  const { validationRule, validationLength } = meta;
  // The editor stores an unset rule as "" with a zero length; both mean no
  // selection-count constraint. Unknown or partially configured rules fail closed.
  if (!validationRule && (validationLength === undefined || validationLength === 0)) {
    return;
  }
  if (validationRule !== undefined || validationLength !== undefined) {
    const rule = checkboxValidationSigns.find((rule) => rule.label === validationRule);
    if (!rule || validationLength === undefined || !Number.isSafeInteger(validationLength) || validationLength < 0) {
      return invalid('Invalid checkbox constraint');
    }
    // Omitted optional selections stay optional; any selection must obey the rule.
    if (selected.length > 0 && !validateCheckboxLength(selected.length, rule.value, validationLength)) {
      invalid('Checkbox choices do not satisfy the configured limit');
    }
  }
};

const validateNumber = (value: string, meta: TNumberFieldMeta) => {
  // Reuse ordinary input validation, but compare limits after parsing the whole
  // formatted number. parseFloat("1,500") is 1 and misses zero-valued bounds.
  assertValid(validateNumberField(value, { ...meta, readOnly: false, minValue: null, maxValue: null }, true));
  const format = meta.numberFormat
    ? numberFormatValues.find((format) => format.value === meta.numberFormat)
    : undefined;
  if (meta.numberFormat && !format) {
    return invalid('Invalid number format');
  }
  if (!format && !/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(value)) {
    return invalid('Invalid number');
  }
  const normalized =
    meta.numberFormat === '123.456.789,00' ? value.replace(/\./g, '').replace(',', '.') : value.replace(/,/g, '');
  const number = new Prisma.Decimal(normalized);
  if (
    !number.isFinite() ||
    (meta.minValue != null && number.lt(meta.minValue)) ||
    (meta.maxValue != null && number.gt(meta.maxValue)) ||
    (meta.minValue != null && meta.maxValue != null && meta.minValue > meta.maxValue)
  ) {
    invalid('Number is outside the configured limits');
  }
};
