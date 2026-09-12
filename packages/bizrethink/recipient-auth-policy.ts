import { FieldType } from '@prisma/client';

/** Both signature representations require the configured signing factor. */
export const isRecipientSignatureField = (type: FieldType | 'DOCUMENT') =>
  type === FieldType.SIGNATURE || type === FieldType.FREE_SIGNATURE;
